# 🚀 usbwidth: Hardware Topology & Bottleneck Advisor

**usbwidth** is a Linux-native desktop utility designed to visualize your USB hardware hierarchy and intelligently identify performance bottlenecks. Built with **Electron, React, and TypeScript**, it provides real-time insights into how your peripherals are connected and whether they are operating at their full potential.

---

## ✨ Key Features

- **🔍 Live Topology Tree**: Visualize your entire USB controller, hub, and device hierarchy in an interactive, real-time tree view.
- **🧠 Context-Aware Rule Engine**: Intelligent status classification for every device:
    - ✅ **NORMAL**: Devices operating at their intended speed.
    - ⚠️ **LIMITED**: Devices functioning correctly but restricted by older standards (e.g., USB 2.0).
    - ❌ **WARNING**: High-bandwidth devices (SSDs, Capture Cards) severely bottlenecked by slow ports or shared hubs.
- **💡 Smart Recommendations**: Actionable, prioritized suggestions to optimize your hardware setup.
- **🏷️ Bandwidth Tiering**: Automatic classification of devices into **LOW**, **MEDIUM**, and **HIGH** bandwidth tiers based on hardware signatures.
- **🐧 Linux Native**: Low-level integration with `sysfs` and `lsusb` (no Windows-specific overhead).

---

## 🛠️ Tech Stack

- **Framework**: [Electron](https://www.electronjs.org/)
- **Frontend**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS (Modern Dark Mode)

---

---

## 🚀 How to Run on Linux

### Option 1: Using the AppImage (Recommended)
1. Download the latest `usbwidth-Linux-x.x.x.AppImage` from the [Releases](https://github.com/justd3ep/usbwidth/releases) page.
2. Open your terminal in the download folder and make it executable:
   ```bash
   chmod +x usbwidth-Linux-1.0.4.AppImage
   ```
3. **Important for Fedora/Sandboxed users**: If the app fails to open, run it with the `--no-sandbox` flag:
   ```bash
   ./usbwidth-Linux-1.0.4.AppImage --no-sandbox
   ```

### Option 2: Building from Source
1. Clone the repository:
   ```bash
   git clone https://github.com/justd3ep/usbwidth.git
   cd usbwidth
   ```
2. Install dependencies & Run:
   ```bash
   npm install
   npm run dev
   ```

---

## 🧠 How it Works
The application traverses `/sys/bus/usb/devices/` to build a real-time map of your system's hardware state. It calculates physical port paths and cross-references them against a weighted tier-mapping system to distinguish between a "slow" device (like a keyboard) and a "bottlenecked" device (like an SSD on a USB 2.0 hub).

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
