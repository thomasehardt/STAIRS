// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import mdx from "@astrojs/mdx";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  site: "https://thomasehardt.github.io/STAIRS",
  base: "/stairs-docs",
  integrations: [
    starlight({
      title: "STAIRS Academy",
      description: "Learn astrophotography from photon to plan",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/thomasehardt/STAIRS",
        },
      ],
      customCss: ["./src/styles/custom.css"],
      editLink: {
        baseUrl: "https://github.com/thomasehardt/STAIRS/edit/main/stairs-docs",
      },
      sidebar: [
        {
          label: "Start Here",
          items: [
            { label: "Welcome", slug: "start-here/welcome" },
            { label: "How to Use This Guide", slug: "start-here/how-to-use" },
          ],
        },
        {
          label: "1. How Telescopes Work",
          items: [
            {
              label: "Telescopes Are Light Buckets",
              slug: "01-telescopes/light-buckets",
            },
            { label: "Optical Designs", slug: "01-telescopes/optical-designs" },
            {
              label: 'What Makes a Telescope "Smart"',
              slug: "01-telescopes/smart-telescopes",
            },
            {
              label: "Deep Dive: Aperture & Focal Ratio",
              slug: "01-telescopes/deep-dive-aperture",
            },
          ],
        },
        {
          label: "2. Photon to Pixel",
          items: [
            {
              label: "Light as Photons",
              slug: "02-photon-pixel/light-as-photons",
            },
            { label: "The Optical Path", slug: "02-photon-pixel/optical-path" },
            { label: "Sensor Capture", slug: "02-photon-pixel/sensor-capture" },
            {
              label: "Color & the Bayer Filter",
              slug: "02-photon-pixel/bayer-filter",
            },
            {
              label: "Deep Dive: QE, Read Noise & Gain",
              slug: "02-photon-pixel/deep-dive-sensor",
            },
          ],
        },
        {
          label: "3. Mounts & Tracking",
          items: [
            { label: "Why Mounts Matter", slug: "03-mounts/why-mounts-matter" },
            { label: "Alt-Az Mounts", slug: "03-mounts/alt-az" },
            { label: "Equatorial Mounts", slug: "03-mounts/equatorial" },
            { label: "Field Rotation", slug: "03-mounts/field-rotation" },
            {
              label: "Deep Dive: Tracking Math",
              slug: "03-mounts/deep-dive-tracking",
            },
          ],
        },
        {
          label: "4. Stacking & SNR",
          items: [
            { label: "Why Stack Images", slug: "04-stacking/why-stack" },
            {
              label: "How Stacking Works",
              slug: "04-stacking/how-stacking-works",
            },
            {
              label: "Alignment & Dithering",
              slug: "04-stacking/alignment-dithering",
            },
            {
              label: "Calibration Frames",
              slug: "04-stacking/calibration-frames",
            },
            {
              label: "Deep Dive: The SNR Equation",
              slug: "04-stacking/deep-dive-snr",
            },
          ],
        },
        {
          label: "5. Planning with STAIRS",
          items: [
            {
              label: "The Scoring Pipeline",
              slug: "05-planning/scoring-pipeline",
            },
            { label: "Object Suitability Score", slug: "05-planning/oss" },
            { label: "Sky Quality Score", slug: "05-planning/sqs" },
            {
              label: "Building an Imaging Plan",
              slug: "05-planning/building-a-plan",
            },
            {
              label: "Deep Dive: Scoring Math",
              slug: "05-planning/deep-dive-scoring",
            },
          ],
        },
        {
          label: "6. Using STAIRS",
          items: [
            { label: "What Is STAIRS?", slug: "06-using-stairs/overview" },
            { label: "Quickstart", slug: "06-using-stairs/quickstart" },
            {
              label: "Multi-Night & Multi-Site",
              slug: "06-using-stairs/multi-night",
            },
            { label: "Configuration", slug: "06-using-stairs/configuration" },
            { label: "CLI Commands", slug: "06-using-stairs/cli" },
            { label: "Web Dashboard", slug: "06-using-stairs/web-dashboard" },
            {
              label: "Session Logging",
              slug: "06-using-stairs/session-logging",
            },
            {
              label: "Troubleshooting",
              slug: "06-using-stairs/troubleshooting",
            },
          ],
        },
      ],
    }),
    mdx(),
  ],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
