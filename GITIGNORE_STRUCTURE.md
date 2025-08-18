# Gitignore Structure for Multi-Project Repository

This repository contains multiple projects with different technology stacks, each with their own `.gitignore` files to ensure proper file exclusion.

## Repository Structure

```
dallosh/
├── .gitignore                    # Project-level gitignore
├── clients/
│   ├── .gitignore               # Clients-level gitignore
│   └── dallosh_web/
│       └── .gitignore           # Next.js client gitignore
└── servers/
    ├── .gitignore               # Servers-level gitignore
    ├── dallosh_bot/
    │   └── .gitignore           # Python bot server gitignore
    └── dallosh_functions/
        └── .gitignore           # Node.js functions server gitignore

sodular/
├── .gitignore                    # Project-level gitignore
├── clients/
│   ├── .gitignore               # Clients-level gitignore
│   └── sodular_web/
│       └── .gitignore           # Next.js client gitignore
└── servers/
    ├── .gitignore               # Servers-level gitignore
    ├── sodular_server/
    │   └── .gitignore           # Python server gitignore
    └── sodular_mongodb/
        └── .gitignore           # MongoDB server gitignore
```

## What Each Level Ignores

### Root Level (`.gitignore`)
- Common patterns across all projects
- Environment files (`.env*`)
- Virtual environments (`venv/`, `.venv/`)
- Node.js dependencies (`node_modules/`)
- Python cache (`__pycache__/`, `*.pyc`)
- Build outputs (`build/`, `dist/`, `.next/`)
- IDE files (`.vscode/`, `.idea/`)
- OS files (`.DS_Store`, `Thumbs.db`)
- Logs and temporary files

### Project Level (`dallosh/.gitignore`, `sodular/.gitignore`)
- Project-specific patterns
- Common to all subdirectories within the project
- Build outputs and dependencies

### Clients Level (`dallosh/clients/.gitignore`, `sodular/clients/.gitignore`)
- Client application specific patterns
- Frontend build tools
- Testing frameworks
- Storybook outputs

### Servers Level (`dallosh/servers/.gitignore`, `sodular/servers/.gitignore`)
- Server application specific patterns
- Python virtual environments
- Database files
- Model files
- Docker artifacts

### Individual Project Level
Each specific project has its own `.gitignore` with patterns tailored to its technology stack.

## Key Exclusions

### Environment Files
- `.env`
- `.env.local`
- `.env.development`
- `.env.test`
- `.env.production`
- `.env.*.local`

### Virtual Environments
- `venv/`
- `.venv/`
- `env/`
- `.ENV/`

### Node.js
- `node_modules/`
- `npm-debug.log*`
- `yarn-debug.log*`
- `.next/`
- `build/`
- `dist/`

### Python
- `__pycache__/`
- `*.pyc`
- `*.pyo`
- `build/`
- `dist/`
- `*.egg-info/`
- `.coverage`
- `.pytest_cache/`

### Build and Cache
- `.cache/`
- `.parcel-cache/`
- `.eslintcache`
- `*.tsbuildinfo`

### IDE and OS
- `.vscode/`
- `.idea/`
- `.DS_Store`
- `Thumbs.db`

### Testing and Coverage
- `coverage/`
- `.nyc_output/`
- `test-results/`
- `.jest/`

## Benefits of This Structure

1. **Granular Control**: Each level can ignore specific patterns relevant to that directory
2. **Maintainability**: Easy to update patterns for specific technology stacks
3. **Flexibility**: Different projects can have different ignore patterns
4. **Consistency**: Common patterns are defined at higher levels
5. **Security**: Environment files and sensitive data are properly excluded

## Usage

When adding new projects or changing technology stacks:

1. **Add a new `.gitignore`** at the appropriate level
2. **Update existing `.gitignore`** files if new patterns are needed
3. **Test the exclusions** by running `git status --ignored`
4. **Commit the `.gitignore`** files to version control

## Verification

To verify that files are being ignored correctly:

```bash
# Check what's being ignored
git status --ignored

# Check specific patterns
git status --ignored | grep -E "\.env|node_modules|venv|__pycache__"

# Check what would be committed
git add . && git status --porcelain
```

## Notes

- `.env.example` files are typically committed to provide template configurations
- Some directories may have permission issues (like `sodular/servers/sodular_mongodb/data/`)
- The `.gitignore` files are committed to version control to ensure all developers use the same exclusions


