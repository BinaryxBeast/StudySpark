# Deployment Guide for StudySpark

This guide provides step-by-step instructions for deploying StudySpark to Firebase Hosting.

## Prerequisites

- Node.js and npm installed
- Access to the Firebase project `studyspark-ed989`
- Admin access to the GitHub repository

## Automated Deployment (Recommended)

StudySpark uses GitHub Actions for continuous deployment. Once configured, deployments happen automatically.

### Initial Setup

#### Step 1: Create Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the `studyspark-ed989` project
3. Click the gear icon (Project Settings)
4. Navigate to the **Service Accounts** tab
5. Click **Generate New Private Key**
6. Click **Generate Key** to download the JSON file
7. **Important:** Keep this file secure and do not commit it to the repository

#### Step 2: Add GitHub Secret

1. Go to your GitHub repository: `https://github.com/BinaryxBeast/StudySpark`
2. Click **Settings** (repository settings, not your profile)
3. In the left sidebar, click **Secrets and variables** > **Actions**
4. Click **New repository secret**
5. Fill in the details:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT_STUDYSPARK_ED989`
   - **Value:** Paste the entire contents of the service account JSON file you downloaded
6. Click **Add secret**

#### Step 3: Enable Deployment

Once the secret is added, the workflows will automatically run:

- **Production Deployment:** When code is pushed to the `main` branch
- **Preview Deployment:** When a pull request is created or updated

### How Automated Deployment Works

1. **On Push to Main:**
   - Workflow: `.github/workflows/firebase-hosting-merge.yml`
   - Installs dependencies in `frontend/`
   - Builds the React app with `npm run build`
   - Deploys to https://studyspark-ed989.firebaseapp.com/

2. **On Pull Request:**
   - Workflow: `.github/workflows/firebase-hosting-pull-request.yml`
   - Builds the app
   - Deploys to a temporary preview URL
   - Posts the preview URL as a comment on the PR
   - Automatically cleans up when PR is closed

### Monitoring Deployments

1. Go to the **Actions** tab in your GitHub repository
2. Click on a workflow run to see details
3. View logs for each step (build, deploy)
4. Check the deployment status and any errors

## Manual Deployment

If you need to deploy manually (e.g., for testing or troubleshooting):

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser window for authentication.

### Step 3: Build the Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### Step 4: Deploy to Firebase

```bash
# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy to a preview channel (optional)
firebase hosting:channel:deploy preview-name
```

### Step 5: Verify Deployment

Visit https://studyspark-ed989.firebaseapp.com/ to see your deployed site.

## Project Structure

```
StudySpark/
├── .github/
│   └── workflows/                    # GitHub Actions workflows
│       ├── firebase-hosting-merge.yml        # Production deployment
│       ├── firebase-hosting-pull-request.yml # PR preview deployment
│       └── README.md                         # Workflow documentation
├── frontend/                         # React application
│   ├── public/                      # Static assets
│   ├── src/                        # Source code
│   ├── build/                      # Build output (generated)
│   ├── package.json                # Dependencies
│   └── README.md                   # Frontend documentation
├── functions/                       # Firebase Cloud Functions
│   ├── index.js                   # Function definitions
│   └── package.json               # Function dependencies
├── public/                         # Legacy hosting directory (if exists)
├── firebase.json                   # Firebase configuration
├── .firebaserc                    # Firebase project ID
├── firestore.rules                # Firestore security rules
├── storage.rules                  # Storage security rules
└── README.md                      # Main documentation
```

## Firebase Configuration

The `firebase.json` file configures Firebase services:

```json
{
  "hosting": {
    "public": "frontend/build",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

Key settings:
- **public:** Points to the React build output directory
- **rewrites:** Enables client-side routing (SPA support)

## Troubleshooting

### Workflow Fails with "Firebase Service Account Not Found"

**Problem:** The GitHub secret is not configured or has the wrong name.

**Solution:**
1. Go to GitHub repository Settings > Secrets and variables > Actions
2. Verify the secret name is exactly: `FIREBASE_SERVICE_ACCOUNT_STUDYSPARK_ED989`
3. Ensure the secret value contains valid JSON

### Build Fails

**Problem:** npm dependencies cannot be installed or build fails.

**Solution:**
1. Check the workflow logs in GitHub Actions
2. Verify `frontend/package.json` is valid
3. Try building locally:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

### Deployment Succeeds but Site Not Updated

**Problem:** Files are cached or deployment didn't complete.

**Solution:**
1. Clear browser cache
2. Try incognito/private mode
3. Check Firebase Hosting dashboard for deployment status
4. Wait a few minutes for CDN propagation

### Manual Deployment Fails

**Problem:** Firebase CLI authentication or permission issues.

**Solution:**
1. Run `firebase logout` then `firebase login`
2. Verify you have Owner/Editor role in Firebase project
3. Check that `.firebaserc` has the correct project ID:
   ```json
   {
     "projects": {
       "default": "studyspark-ed989"
     }
   }
   ```

### Preview URLs Not Generated for PRs

**Problem:** Pull request from a fork or incorrect permissions.

**Solution:**
- Preview deployments only work for PRs from the same repository (not forks)
- For fork PRs, reviewers can manually pull and deploy locally

## Security Best Practices

1. **Never commit service account keys** to the repository
2. **Use GitHub secrets** for sensitive credentials
3. **Limit service account permissions** to only what's needed
4. **Rotate service accounts** periodically
5. **Review security rules** in `firestore.rules` and `storage.rules`

## Additional Resources

- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [React Deployment Guide](https://create-react-app.dev/docs/deployment/)

## Support

For deployment issues:
1. Check the workflow logs in GitHub Actions
2. Review this documentation
3. Check Firebase Console for project status
4. Open an issue in the repository with logs and error messages

## Next Steps After Initial Deployment

1. Set up custom domain (optional)
2. Configure SSL certificate (automatic with Firebase)
3. Set up analytics and monitoring
4. Configure caching headers for optimal performance
5. Set up alerts for deployment failures
