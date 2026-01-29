# RAG Full example with MDN docs

The goal of the example is to use embeddings to retrieve relevant documentation from MDN Web Docs and use it to answer questions about web development.

- **R**etrieval the data most relevant to the request
- **A**ugment the user's prompt by adding the query results
- **G**enerate an AI response relevant to the augmented prompt

Process request:
1. Make an Embedding of the User Question
2. Query the Vector DB Embeddings wihthin a certain distance of that query
3. Pass on the Matched Context to the Generative AI
4. Finally, return a Grounded/Informed Response
