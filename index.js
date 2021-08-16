const { ApolloServer, gql, makeExecutableSchema } = require('apollo-server');
const mongoose = require('mongoose');
const { Mongo } = require('@accounts/mongo');
const {
  mergeTypeDefs,
  mergeResolvers,
} = require('@graphql-toolkit/schema-merging');
const { AccountsServer } = require('@accounts/server');
const { AccountsPassword } = require('@accounts/password');
const { AccountsModule } = require('@accounts/graphql-api');

// We connect mongoose to our local mongodb database
mongoose.connect('mongodb://localhost:27017/accounts-js-server', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const accountsMongo = new Mongo(mongoose.connection);

const typeDefs = gql`
  type Query {
    # This query will be protected so only authenticated users can access it
    sensitiveInformation: String
  }
`;

const resolvers = {
  Query: {
    sensitiveInformation: () => 'Sensitive info',
  },
};

const accountsPassword = new AccountsPassword({});

const accountsServer = new AccountsServer(
  {
    db: accountsMongo,
    // Replace this value with a strong secret
    tokenSecret: 'my-super-random-secret',
  },
  {
    password: accountsPassword,
  }
);

// We generate the accounts-js GraphQL module
const accountsGraphQL = AccountsModule.forRoot({ accountsServer });

// A new schema is created combining our schema and the accounts-js schema
const schema = makeExecutableSchema({
  typeDefs: mergeTypeDefs([typeDefs, accountsGraphQL.typeDefs]),
  resolvers: mergeResolvers([accountsGraphQL.resolvers, resolvers]),
  schemaDirectives: {
    ...accountsGraphQL.schemaDirectives,
  },
});

const server = new ApolloServer({ schema, context: accountsGraphQL.context });

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});