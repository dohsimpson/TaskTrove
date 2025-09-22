# Debug Components

This directory contains components that are only available in development environment.

## Components

### SoundTester

- **Purpose**: Test all audio effects used in TaskTrove
- **Features**:
  - Play all 17 different sound effects
  - View technical descriptions and use cases
  - Compare different bell sounds for todo completion
  - See frequency specifications and envelope details

## Usage

These components are automatically excluded from production builds through environment checks.

### Accessing Debug Tools

In development mode, visit `/debug` to access all debugging utilities.

### Development Guidelines

1. **Environment Check**: All debug components check `process.env.NODE_ENV !== 'development'`
2. **No Production Access**: Debug routes return 404 in production
3. **Clear Labeling**: All debug components include development-only warnings
4. **Performance**: Debug tools may include verbose logging and performance tracking

## Security Notes

- Debug tools are never accessible in production
- No sensitive data should be exposed through debug tools
- All debug routes include proper environment validation
