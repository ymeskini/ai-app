Before we deploy our application to production, we need to make sure that our users can't take advantage of us.

We've integrated paid services into our app, and we need to make sure that users can't bankrupt us.

To do that, we are going to track the number of requests made by each user per day, and impose some kind of limit.

We should also add some kind of 'admin' role that can be used to bypass the rate limit.

## Steps To Complete

- Find the place where we're specifying the database schema
- Add a new table to track the requests made by each user. Make sure they are associated with the user's ID.
- Add a new column to the `User` table to specify if the user is an admin. Default it to `false`.
- Run `npm run db:push` to update the database
- Find the place where we're calling the AI, using the AI SDK.
- Before the AI call, check the number of requests made by the user today.
- If the user has made too many requests, return a 429 error (Too Many Requests).
- If the user is an admin, bypass the rate limit check.
- If they are allowed to make a request, add the new request to the table.
- Run the code locally to make sure it works.
- Use `npm run db:studio` to check that the request is being recorded.
- Use the studio to make your own user an admin.
