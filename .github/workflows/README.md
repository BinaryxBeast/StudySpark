# Firebase Hosting Deployment Workflows

This directory contains GitHub Actions workflows for automated deployment to Firebase Hosting.

## Workflows

### 1. `firebase-hosting-merge.yml`
Automatically deploys to Firebase Hosting when code is pushed to the `main` branch.

**Trigger:** Push to `main` branch
**Action:** Builds the React app and deploys to production hosting

### 2. `firebase-hosting-pull-request.yml`
Creates preview deployments for pull requests.

**Trigger:** Pull request creation/update
**Action:** Builds the React app and deploys to a preview channel

## Setup Requirements

### Firebase Service Account

To enable automated deployments, you need to set up a Firebase service account:

1. Go to your Firebase project settings
2. Navigate to the Service Accounts tab
3. Generate a new private key
4. Add the service account JSON as a GitHub secret named `FIREBASE_SERVICE_ACCOUNT_STUDYSPARK_ED989`

### GitHub Secrets

The following secrets need to be configured in your GitHub repository settings:

- `FIREBASE_SERVICE_ACCOUNT_STUDYSPARK_ED989`: Firebase service account credentials (JSON)
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

### Setting Up the Secret

1. Go to your repository on GitHub
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Name: `FIREBASE_SERVICE_ACCOUNT_STUDYSPARK_ED989`
5. Value: Paste the entire JSON content of your Firebase service account key
6. Click "Add secret"

## How It Works

### Production Deployment (main branch)
1. Code is pushed to the `main` branch
2. GitHub Actions workflow is triggered
3. Dependencies are installed in the frontend directory
4. React app is built using `npm run build`
5. Built files are deployed to Firebase Hosting
6. Site is live at https://studyspark-ed989.firebaseapp.com/

### Preview Deployment (Pull Requests)
1. A pull request is created or updated
2. GitHub Actions workflow is triggered
3. Dependencies are installed and app is built
4. Built files are deployed to a temporary preview URL
5. Preview URL is posted as a comment on the pull request
6. Preview is automatically deleted when PR is closed

## Manual Deployment

If you need to deploy manually:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Build the frontend
cd frontend
npm install
npm run build
cd ..

# Deploy to Firebase
firebase deploy --only hosting
```

## Project Structure

```
StudySpark/
├── .github/
│   └── workflows/          # GitHub Actions workflows
├── frontend/               # React application
│   ├── public/            # Static files
│   ├── src/               # Source code
│   ├── build/             # Built files (generated)
│   └── package.json       # Frontend dependencies
├── functions/             # Firebase Functions
├── firebase.json          # Firebase configuration
└── .firebaserc           # Firebase project settings
```

## Troubleshooting

### Build Fails
- Check that all dependencies are correctly installed
- Verify the build script in `frontend/package.json`
- Check the workflow logs in GitHub Actions

### Deployment Fails
- Verify the Firebase service account secret is correctly set
- Check that the project ID in `.firebaserc` matches your Firebase project
- Ensure the hosting configuration in `firebase.json` points to `frontend/build`

### Preview URL Not Generated
- Ensure the pull request is from the same repository (not a fork)
- Check that the `GITHUB_TOKEN` has proper permissions

## Additional Resources

- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Firebase GitHub Action](https://github.com/FirebaseExtended/action-hosting-deploy)
