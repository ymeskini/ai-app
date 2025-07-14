Our app is currently open to anyone. If we're going to deploy this, we need to restrict access to only logged-in users, so we can track their usage.

There are many options for this. We're using `next-auth`, so any of their providers will work.

But since you've got a Discord account (to gain access to the course chat), we'll use Discord authentication.

Discord authentication is also extremely simple to set up. Use this [excellent guide](https://create.t3.gg/en/usage/first-steps#authentication) to get started.

## Steps to Complete

- Ensure that you have a `AUTH_DISCORD_SECRET` and a `AUTH_DISCORD_ID` in your `.env` file.
- Don't modify the existing `next-auth` config to explicitly pass the environment variables - it will work as is.
- Hook up the authentication to the existing Login and Logout buttons
- Check that the user is logged in before they can chat (in the /api/chat route). If they are not logged in, return a 401 error
- Do NOT modify the icon used in the button.

The exercise is complete when:

- You have a Discord API token in your `.env` file
- The user can Log In and Log Out

Not required yet:

- Anonymous chatting
- Saving chats
