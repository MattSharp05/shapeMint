# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## How to Run

### Prerequisites
- **Node.js**: Version 18.x or newer (tested up to 22.x). You can check your version with:
  ```bash
  node -v
  ```

### Install dependencies
Run the following command in your project directory to install all required packages:
```bash
npm install
```

### Start the development server
Launch the app in development mode with:
```bash
npm run dev
```
This will start the Vite dev server, and it will show you a local URL (usually http://localhost:5173) where you can view your app.

### Build for production
To create an optimized production build:
```bash
npm run build
```

### Preview the production build
You can preview the production build locally with:
```bash
npm run preview
```

## Troubleshooting

- **Port already in use**
  - If you see an error like `Port 5173 is already in use`, either close the other process or run:
    ```bash
    npm run dev -- --port=5174
    ```
- **Dependency issues**
  - If you get errors about missing or incompatible packages, try deleting `node_modules` and `package-lock.json`, then reinstall:
    ```bash
    rm -rf node_modules package-lock.json
    npm install
    ```
- **Node version errors**
  - If you see errors about Node.js version, ensure you're using Node.js 18.x or newer. You can check your version with:
    ```bash
    node -v
    ```
