const gql = require("graphql-tag").default;
const fetchMock = require("fetch-mock");
const LegacyApolloClient = require("apollo-client").ApolloClient;
const LegacyApolloCache = require("apollo-cache-inmemory").InMemoryCache;
const LegacyApolloHttpLink = require("apollo-link-http").HttpLink;
const NewApolloClient = require("@apollo/client").ApolloClient;
const NewApolloCache = require("@apollo/client").InMemoryCache;
const NewApolloHttpLink = require("@apollo/client").HttpLink;

const BarQuery = gql`
  query BarQuery {
    foo {
      bar
    }
  }
`;

const mockBarResponse = {
  foo: {
    __typename: "FooQuery",
    bar: {
      __typename: "Bar",
      value: 1
    }
  }
};

const BazQuery = gql`
  query BarQuery {
    foo {
      baz
    }
  }
`;

const mockBazResponse = {
  foo: {
    __typename: "FooQuery",
    baz: {
      __typename: "Bar",
      value: 1
    }
  }
};
fetchMock.post("/graphql", (url, { body }) => {
  if (/bar/.test(body)) return { body: { data: mockBarResponse } };
  else if (/baz/.test(body)) return { body: { data: mockBazResponse } };
  else throw new Error("No matching route");
});

describe.each([
  ["Legacy", LegacyApolloClient, LegacyApolloCache, LegacyApolloHttpLink],
  ["New", NewApolloClient, NewApolloCache, NewApolloHttpLink]
])("%s client", (_name, Client, Cache, HttpLink) => {
  it("can make two request and cache both", async () => {
    let client = new Client({
      link: new HttpLink({
        uri: "/graphql"
      }),
      cache: new Cache({
        typePolicies: {
          Query: {
            fields: {
              foo: {
                merge(a, b) {
                  return { ...a, ...b };
                }
              }
            }
          }
        }
      })
    });

    const barResult = await client.query({ query: BarQuery });
    expect(barResult.data).toEqual(mockBarResponse);
    expect(client.cache.readQuery({ query: BarQuery })).toEqual(
      mockBarResponse
    );

    const bazResult = await client.query({ query: BazQuery });
    expect(bazResult.data).toEqual(mockBazResponse);
    expect(client.cache.readQuery({ query: BazQuery })).toEqual(
      mockBazResponse
    );
    expect(client.cache.readQuery({ query: BarQuery })).toEqual(
      mockBarResponse
    );
  });
});
