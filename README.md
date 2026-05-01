# DSY Designer 🎨

**DSY Designer** is a professional-grade, web-based tool for generating PBR (Physically Based Rendering) texture maps. Designed for game developers and 3D artists, it allows you to create high-quality Normal, Metallic, Roughness, and Ambient Occlusion maps directly from your browser.

![DSY Designer Banner](https://github.com/Syd25-legend/dsy-designer/raw/main/public/Group%204.png)

## ✨ Features

-   **Layer-Based Workflow**: Manage multiple image layers and paint strokes across different channels.
-   **Channel Management**: Dedicated editing for **Height**, **Metallic**, and **Roughness** channels.
-   **Real-time 3D Preview**: Visualize your textures on a 3D model using **Three.js** and **React Three Fiber**.
-   **Normal Map Generation**: Built-in Sobel filters and processing to convert height/grayscale images into high-fidelity normal maps.
-   **Advanced Export Options**:
    -   **Normal Maps**: Standalone normal map export.
    -   **Unity Mask Maps**: Industry-standard packed textures (Metallic, Occlusion, Detail, Smoothness).
    -   **Ambient Occlusion (AO)**: Automatically generated from height data.
-   **Painting Tools**: Brush-based painting for direct texture modification.
-   **Project Persistence**: Support for local directory auto-saving via the **File System Access API**.
-   **PWA Ready**: Install as a desktop application for an offline, app-like experience.

## 🚀 Tech Stack

-   **Frontend**: [React 19](https://react.dev/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **3D Rendering**: [Three.js](https://threejs.org/) & [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **Styling**: Modern CSS with Glassmorphism aesthetics.

## 🛠️ Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (Latest LTS recommended)
-   npm or yarn

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Syd25-legend/dsy-designer.git
    cd dsy-designer
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```

4.  **Open your browser**:
    Navigate to `http://localhost:5173` (or the port specified by Vite).

## 📖 Usage

1.  **Import Assets**: Drag and drop images directly onto the canvas to add them as layers.
2.  **Edit Channels**: Switch between Height, Metallic, and Roughness tabs in the left sidebar.
3.  **Adjust Settings**: Use the right-hand panel to tweak intensity, blur, and filter types.
4.  **3D Preview**: Toggle the **3D** button to see your material applied to a live model.
5.  **Export**: Use the top bar to export your final maps in various formats.

## 🤝 Contributing

Contributions are welcome! If you have ideas for new filters, features, or performance improvements, feel free to open an issue or submit a pull request.

## 📄 License

This project is private and intended for specific use. Check `package.json` for details.

---

*Made with ❤️ for the Gamedev Community.*
