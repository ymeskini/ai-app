# Hot Reload Test for Docker + Turbopack

This document describes how to test the hot reload functionality with Docker Compose watch and Turbopack.

## Prerequisites

- Docker and Docker Compose v2.22+ (required for the `--watch` flag)
- The application properly configured with `.env` file

## Quick Test

1. **Start the application with hot reload:**
   ```bash
   docker compose up --watch
   ```

2. **Verify the application is running:**
   - Open http://localhost:3000
   - You should see the AI chat application

3. **Test hot reload:**
   - Make a change to any file in `src/` (e.g., modify the page title in `src/app/page.tsx`)
   - Save the file
   - Watch the Docker logs - you should see Turbopack rebuild messages
   - Refresh the browser to see your changes reflected immediately

## Expected Behavior

- **File change detection:** Docker watch should detect file changes in `src/` and `public/` folders
- **Turbopack rebuild:** Turbopack should recompile only the changed files (fast)
- **Browser update:** Changes should be visible after refresh (or automatically with Next.js fast refresh)

## Docker Compose Watch Configuration

The `docker-compose.yml` includes:

```yaml
develop:
  watch:
    - action: sync
      path: ./src
      target: /app/src
      ignore:
        - node_modules/
    - action: sync
      path: ./public
      target: /app/public
    - action: rebuild
      path: package.json
```

This configuration:
- **Syncs** source file changes from host to container
- **Ignores** node_modules to avoid conflicts
- **Rebuilds** the container when package.json changes

## Troubleshooting

If hot reload isn't working:

1. **Check Docker Compose version:**
   ```bash
   docker compose version
   # Should be v2.22.0 or higher for --watch support
   ```

2. **Verify Turbopack is running:**
   ```bash
   docker compose logs app
   # Should show "○ Local:    http://localhost:3000" with turbopack messages
   ```

3. **Check file sync:**
   ```bash
   # Make a change to a file, then check if it's synced in the container
   docker compose exec app ls -la /app/src/app/
   ```

## Comparison with Volume Mounting

The old approach used volume mounting with `WATCHPACK_POLLING=true`:
- ❌ Only worked with webpack, not Turbopack
- ❌ Required polling which is resource-intensive
- ❌ Could have permission issues on some systems

The new approach uses Docker Compose watch:
- ✅ Works with both webpack and Turbopack
- ✅ Uses efficient file system events instead of polling
- ✅ Better performance and reliability