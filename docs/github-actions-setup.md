# GitHub Actions Setup Guide

This document covers the setup and configuration of automated Docker builds and Kubernetes deployments using GitHub Actions.

## Overview

The workflow automatically:

- Builds multi-platform Docker images (AMD64/ARM64)
- Pushes to GitHub Container Registry (ghcr.io)
- Deploys to Kubernetes clusters
- Creates GitHub releases for new versions
- Provides supply chain security with artifact attestations

## Workflow Features

### 2025 Best Practices

- **Latest action versions**: checkout@v5, docker actions v3/v6
- **Supply chain security**: SLSA Build Level 2 compliance with artifact attestations
- **Multi-platform builds**: AMD64 and ARM64 support
- **Smart caching**: GitHub Actions cache optimization
- **Secure authentication**: Uses GitHub's native `GITHUB_TOKEN`

### Docker Image Tagging Strategy

**Every build gets:**

- `ghcr.io/OWNER/REPO:dev` (tracks latest commit)

**New versions only get all 4 tags:**

- `ghcr.io/OWNER/REPO:dev`
- `ghcr.io/OWNER/REPO:v{VERSION}`
- `ghcr.io/OWNER/REPO:latest`
- `ghcr.io/OWNER/REPO:demo`

This ensures `latest` and `demo` stay in sync with actual releases, while `dev` tracks development commits.

## Required Secrets Configuration

Configure these secrets in GitHub repository settings (Settings → Secrets and variables → Actions):

### 1. KUBE_CONFIG (Required)

Your Kubernetes cluster configuration, **base64 encoded**.

```bash
# Encode your kubeconfig
cat ~/.kube/config | base64 | tr -d '\n'
```

**Important:** The kubeconfig must be base64 encoded because:

- GitHub Secrets store text values
- Kubeconfig contains binary certificate data and multi-line YAML
- The `actions-hub/kubectl` action automatically decodes base64

### 2. KUBE_NAMESPACE (Required)

The Kubernetes namespace where your demo deployment runs.

**Example values:**

- `default`
- `demo`
- `production`

### 3. KUBE_DEPLOYMENT (Required)

The name of your Kubernetes deployment.

**Example values:**

- `myapp-demo`
- `myapp-production`
- `web-server`

## No Docker Registry Secrets Needed

The workflow uses GitHub's built-in `GITHUB_TOKEN` for ghcr.io authentication - no manual Docker credentials required!

**How GITHUB_TOKEN "Just Works":** When you enable GitHub Actions, GitHub automatically installs a GitHub App on your repository that generates a new, repository-scoped access token for each workflow run, which expires when the job completes. ([Learn more](https://docs.github.com/en/actions/concepts/security/github_token))

## Workflow Triggers

The workflow runs on pushes to:

- `main` branch (production deployments)
- `github-actions` branch (testing workflow changes)

You can customize the trigger branches by editing the workflow file.

## Jobs Overview

### 1. build-and-push

- Builds multi-platform Docker images
- Pushes to ghcr.io with smart tagging
- Generates artifact attestations
- Checks for version conflicts

### 2. deploy-demo

- Triggers Kubernetes rollout restart
- Only runs on successful builds
- Uses kubectl to restart deployment

### 3. create-release

- Creates GitHub releases for new versions
- Auto-generates release notes
- Only runs for new versions

## Testing the Workflow

1. **Push to test branch** to test workflow changes
2. **Check Actions tab** in GitHub repository for build status
3. **Verify images** are pushed to ghcr.io packages
4. **Confirm deployment** rollout in your Kubernetes cluster

## Version Management

The workflow automatically detects versions from `package.json`:

- **New versions**: Get full tag set and trigger deployment
- **Existing versions**: Only update `dev` tag
- **Release creation**: Automatic for new versions with generated notes

## Supply Chain Security

### Artifact Attestations

- **SLSA Build Level 2** compliance
- **Provenance tracking** from source to deployment
- **Tamper-proof** container images via Sigstore
- **Verification**: Use GitHub CLI or Kubernetes admission controllers

### Security Benefits

- Unforgeable link between artifacts and build process
- Enhanced confidence in software supply chain
- Compliance with modern security standards

## Troubleshooting

### Common Issues

**Authentication failures:**

- Ensure `KUBE_CONFIG` is properly base64 encoded
- Verify secrets are set in correct repository
- Check kubeconfig has sufficient permissions

**Docker build failures:**

- Review Dockerfile for syntax errors
- Check multi-platform build compatibility
- Verify base image availability

**Deployment failures:**

- Confirm Kubernetes cluster connectivity
- Verify deployment name and namespace
- Check rollout permissions in kubeconfig

### Viewing Logs

- GitHub Actions tab shows detailed build logs
- Use `kubectl logs` for deployment troubleshooting
- Check container registry for pushed images

## Migration from DockerHub

If migrating from DockerHub:

1. Update all image references to use ghcr.io URLs
2. Remove DockerHub credentials from secrets
3. Rely on GitHub's native authentication
4. Update deployment configs to pull from ghcr.io

## Best Practices

1. **Test workflow changes** on `github-actions` branch first
2. **Use semantic versioning** in package.json for releases
3. **Monitor build logs** for security warnings
4. **Regularly update** action versions for security patches
5. **Validate attestations** in production environments
