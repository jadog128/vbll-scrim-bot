module.exports = async (req, res) => {
  const { code, debug } = req.query;

  // READ CONFIG
  const clientID = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET;
  const redirectURI = process.env.DISCORD_REDIRECT_URI || process.env.REDIRECT_URI || `https://${req.headers.host}/api/auth`;

  // DEBUG MODE OR MISSING CONFIG
  if (debug || !clientID || !clientSecret) {
    return res.status(200).send(`
      <div style="font-family: 'Inter', sans-serif; padding: 2.5rem; max-width: 650px; margin: 4vh auto; border: 1px solid #4da6ff; border-radius: 20px; background: #0a0a0a; color: #fff; shadow: 0 20px 50px rgba(0,0,0,0.5);">
         <h2 style="color: #4da6ff; font-weight: 900; font-size: 2rem; margin-bottom: 1rem;">OAuth2 Debugger 🔍</h2>
         <p style="color: #888; margin-bottom: 2rem;">Discord is very strict. You must copy the URL below <b>EXACTLY</b> into your Discord Developer Portal.</p>
         
         <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 2rem;">
            <p style="margin-bottom: 1rem; font-weight: 700; color: #4da6ff;">1. Copy this URL:</p>
            <code style="display: block; background: #000; padding: 1rem; border-radius: 8px; color: #fff; border: 1px solid #333; word-break: break-all;">${redirectURI}</code>
         </div>

         <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
            <p style="margin-bottom: 1rem; font-weight: 700; color: #4da6ff;">2. Paste it here:</p>
            <p style="font-size: 0.9rem; color: #ccc;">Discord Dev Portal > Your App > <b>OAuth2</b> > Redirects</p>
         </div>

         <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #222;">
            <a href="/api/auth" style="color: #4da6ff; text-decoration: none; font-weight: 700;">&larr; Try Login Again</a>
         </div>
      </div>
    `);
  }

  // 2. Redirect to Discord
  if (!code) {
    const scope = encodeURIComponent('identify guilds.members.read');
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientID}&redirect_uri=${encodeURIComponent(redirectURI)}&response_type=code&scope=${scope}`;
    return res.redirect(authUrl);
  }

  // 3. Handle Callback
  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: clientID,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectURI,
        scope: 'identify',
      }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
       return res.status(400).send(`<h2>Token Exchange Error</h2><p>${tokenData.error_description}</p><p>Used Redirect: ${redirectURI}</p>`);
    }

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();

    res.redirect(`/profile.html?user=${encodeURIComponent(JSON.stringify(userData))}`);
  } catch (error) {
    res.status(500).send('Auth System Error: ' + error.message);
  }
};
