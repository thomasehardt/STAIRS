package com.stairs.mobilepoc;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * Self-update support for a sideloaded build. GitHub release assets don't send
 * CORS headers, so the WebView can't fetch them; this plugin does the version
 * check and the APK download natively, then hands the file to the system
 * package installer (which always asks the user to confirm - Android does not
 * allow silent updates outside Play / device-owner apps).
 *
 * JS side: window.Capacitor.Plugins.AppUpdater (see index.html).
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    private static final String UPDATE_DIR = "updates";
    private static final int CONNECT_TIMEOUT_MS = 15_000;
    private static final int READ_TIMEOUT_MS = 30_000;

    /** Installed versionCode / versionName. */
    @PluginMethod
    public void getInfo(PluginCall call) {
        try {
            PackageInfo pi = getContext().getPackageManager()
                    .getPackageInfo(getContext().getPackageName(), 0);
            JSObject ret = new JSObject();
            ret.put("versionCode", Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                    ? pi.getLongVersionCode() : pi.versionCode);
            ret.put("versionName", pi.versionName);
            ret.put("canInstall", canRequestInstalls());
            call.resolve(ret);
        } catch (PackageManager.NameNotFoundException e) {
            call.reject("package info unavailable: " + e.getMessage());
        }
    }

    /** Fetches a JSON manifest (latest.json) and returns it parsed. */
    @PluginMethod
    public void check(PluginCall call) {
        String url = call.getString("url");
        if (url == null) {
            call.reject("url is required");
            return;
        }
        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                conn = open(url);
                if (conn.getResponseCode() != 200) {
                    call.reject("manifest HTTP " + conn.getResponseCode());
                    return;
                }
                StringBuilder sb = new StringBuilder();
                try (BufferedReader r = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
                    String line;
                    while ((line = r.readLine()) != null) sb.append(line);
                }
                call.resolve(new JSObject(sb.toString()));
            } catch (Exception e) {
                call.reject("manifest fetch failed: " + e.getMessage());
            } finally {
                if (conn != null) conn.disconnect();
            }
        }).start();
    }

    /**
     * Opens the system "allow installs from this app" screen. Needed once on
     * Android 8+ before the installer will accept an APK from us.
     */
    @PluginMethod
    public void requestInstallPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        }
        call.resolve();
    }

    /**
     * Downloads the APK to the app cache (emitting "downloadProgress" events),
     * verifies its sha256, and launches the package installer.
     */
    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        String expectedSha = call.getString("sha256");
        if (url == null) {
            call.reject("url is required");
            return;
        }
        if (!canRequestInstalls()) {
            call.reject("install permission not granted", "PERMISSION");
            return;
        }
        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                File dir = new File(getContext().getCacheDir(), UPDATE_DIR);
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("cannot create " + dir);
                File apk = new File(dir, "stairs-poc.apk");

                conn = open(url);
                if (conn.getResponseCode() != 200) throw new Exception("APK HTTP " + conn.getResponseCode());
                long total = conn.getContentLengthLong();
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                long received = 0;
                long lastNotify = 0;
                try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(apk)) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        md.update(buf, 0, n);
                        received += n;
                        long now = System.currentTimeMillis();
                        if (now - lastNotify > 100 || received == total) {
                            lastNotify = now;
                            JSObject p = new JSObject();
                            p.put("received", received);
                            p.put("total", total);
                            notifyListeners("downloadProgress", p);
                        }
                    }
                }

                String sha = toHex(md.digest());
                if (expectedSha != null && !expectedSha.equalsIgnoreCase(sha)) {
                    apk.delete();
                    throw new Exception("sha256 mismatch (got " + sha.substring(0, 12) + "...)");
                }

                Uri uri = FileProvider.getUriForFile(getContext(),
                        getContext().getPackageName() + ".fileprovider", apk);
                Intent i = new Intent(Intent.ACTION_VIEW);
                i.setDataAndType(uri, "application/vnd.android.package-archive");
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);

                JSObject ret = new JSObject();
                ret.put("bytes", received);
                ret.put("sha256", sha);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("update failed: " + e.getMessage());
            } finally {
                if (conn != null) conn.disconnect();
            }
        }).start();
    }

    private boolean canRequestInstalls() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O
                || getContext().getPackageManager().canRequestPackageInstalls();
    }

    /** GET with redirects followed (GitHub release downloads 302 to a CDN). */
    private static HttpURLConnection open(String url) throws Exception {
        String current = url;
        for (int hop = 0; hop < 5; hop++) {
            HttpURLConnection conn = (HttpURLConnection) new URL(current).openConnection();
            conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
            conn.setReadTimeout(READ_TIMEOUT_MS);
            conn.setInstanceFollowRedirects(false);
            conn.setRequestProperty("Cache-Control", "no-cache");
            conn.setRequestProperty("User-Agent", "STAIRS-mobile-poc");
            int code = conn.getResponseCode();
            if (code / 100 == 3) {
                String loc = conn.getHeaderField("Location");
                conn.disconnect();
                if (loc == null) throw new Exception("redirect without Location");
                current = new URL(new URL(current), loc).toString();
                continue;
            }
            return conn;
        }
        throw new Exception("too many redirects");
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
