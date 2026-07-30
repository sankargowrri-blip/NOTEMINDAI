# NoteMind AI — Public Deployment Walkthrough

I have prepared your project for a full-scale public deployment. Since you want a link that works on any computer without your local machine running, we are moving the app to the cloud.

## Deployment Status Summary

| Component | Target Hosting | Config File | Status |
| :--- | :--- | :--- | :--- |
| **Backend API** | Render.com | [render.yaml](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/render.yaml) | **Ready** |
| **Frontend UI** | Netlify.com | [netlify.toml](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/netlify.toml) | **Ready** |

---

## Step 1: Deploy the Backend (API)

The backend is configured to use Render's "Blueprint" feature. This will set up your database and API in one go.

1.  Log in to [Render Dashboard](https://dashboard.render.com).
2.  Click **New** > **Blueprint**.
3.  Connect your GitHub repository: `sankargowrri-blip/NOTEMINDAI`.
4.  Render will read the `render.yaml` file.
5.  **Environment Variables**: It will ask you for `GROQ_API_KEY` and `OPENAI_API_KEY`. Enter your API keys there.
6.  Click **Apply**.

> [!NOTE]
> Once deployed, your backend will be at: `https://notemind-api.onrender.com`

---

## Step 2: Deploy the Frontend (UI)

We will use Netlify for the frontend as it has excellent support for Next.js.

1.  Log in to [Netlify Dashboard](https://app.netlify.com).
2.  Click **Add new site** > **Import an existing project**.
3.  Choose **GitHub** and select the `NOTEMINDAI` repo.
4.  **Important Settings**:
    - **Base directory**: `frontend`
    - **Build command**: `npm run build`
    - **Publish directory**: `.next`
5.  **Environment Variables**:
    - Add `NEXT_PUBLIC_API_URL` = `https://notemind-api.onrender.com`
6.  Click **Deploy site**.

---

## Step 3: Accessing Your Public Link

Once the deployments finish (usually takes 3-5 minutes):

1.  Netlify will give you a link like `https://notemind-ai.netlify.app`.
2.  **This is your public link.** You can open it on any phone, tablet, or laptop in the world.

---

## Verification Checklist
- [ ] Backend is live at `/health` endpoint.
- [ ] Frontend loads and displays the login screen.
- [ ] AI features work (requires the API keys you provided in Step 1).

> [!CAUTION]
> Render's **Free Tier** spins down after 15 minutes of inactivity. The first time you open the public link after a break, it might take 30-60 seconds to "wake up".
