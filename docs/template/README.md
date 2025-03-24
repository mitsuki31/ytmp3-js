## Documentation Landing Page Template

This template provides a simple yet effective way to manage multiple versions of API documentation for this project. It is especially useful for users who need access to older versions while transitioning to newer ones.

### How It Works

- The `index.html` file serves as the **main entry point** to the documentation.
- The `main.js` script dynamically generates version selection buttons by reading a file named `versions.json` in the current directory.
- The `versions.json` file contains a list of folder names, each representing a different documentation version.

### `versions.json` Structure

The `versions.json` file follows this format:

```json
{
  "versions": [
    "vX.X.X",
    "X.X.X",
    "X.X.X-{build}"
  ]
}
```

**Example:**

```json
{
  "versions": [
    "v1.0.0",
    "v1.1.0",
    "v2.0.0",
    "v2.1.0-beta"
  ]
}
```

Each entry in the `versions` array corresponds to a folder that contains the documentation for that version. When a user selects a version, they are redirected to the respective folder.

### Folder Structure Example

```
/docs
  ├── index.html  # Main entry point
  ├── versions.json  # Stores available documentation versions
  ├── v1.0.0/  # Documentation for v1.0.0
  ├── v1.1.0/  # Documentation for v1.1.0
  ├── v2.0.0/  # Documentation for v2.0.0
  ├── v2.1.0-beta/  # Documentation for v2.1.0-beta
  ├── styles.css  # Styles for the landing page
  └── main.js  # Handles version box generation
```

This structure ensures that users can seamlessly navigate between different documentation versions.

