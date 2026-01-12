---
description: Deploy StudySpark to Firebase (Hosting & Functions)
---

1. Deploy Cloud Functions (Backend)
   ```bash
   firebase deploy --only functions
   ```

2. Build and Deploy Frontend (Hosting)
   ```bash
   cd frontend
   npm run build
   cd ..
   firebase deploy --only hosting
   ```
