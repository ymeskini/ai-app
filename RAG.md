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

# Chunking data

There are different strategies to chunk data for a RAG system, we need to chunk data to improve performance and accuracy of queries:
- Length bases chunking
- Simple sentence/paragraph splitting
- Recursive character level chunking
- Document structure based chunking

We'll use document structure chunking in our project with `LangChain`
We have the mdn markdown files in `@mdn` folder and to chunk them we run the script located at `@scripts/chunk-mdn-docs.ts`


# Embedding model

Criterias:
- Accuracy: how well does it capture semantic meaning?
- Dimensionality: the higher the more nuance captured
- Domain suitability: some trained on domain specific content
- Speed and cost: choose a balance to fit your needs

We'll use [Voyage model](https://www.voyageai.com/)


# Vector DBs for RAG

Most of the DBs we already use in our apps has a support for Vectors:

- Postgres has `pgvector` (also supabase)
- Redis
- MongoDB

We'll use Postgres for this project

# Complete workflow

The steps to build the vectors are:
- Gather docs (for our example we retrieved markdown files from mdn doc on Github)
- Chunk the docs (check `@scripts/chunk-mdn-docs.ts`)
- Embed the chunks to store them in the DB (with `pgvector`)
- Make the request with the Cosine query check the example `@scripts/rag-test.ts`
There a other queries possible check [pgvector](https://github.com/pgvector/pgvector?tab=readme-ov-file#querying)

We define Top-K (which is the limit of documents to retrieve) for the query:
- A low Top-K misses relevant context leading to incomplete answers
- A high Top-K risks adding noise causing confusion and higher token usage
