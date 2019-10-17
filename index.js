const { ApolloServer, gql } = require("apollo-server");
const axios = require("axios");

const APIKEY = "02197ea2df1092a055d0a6ba48b3b503";
const makeURL = id =>
  `https://api.themoviedb.org/3find/${id}?api_key=${APIKEY}&external_source=imdb_id`;

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  type Info {
    poster_path: String
    backdrop_path: String
    release_date: String
    overview: String
  }
  type Movie {
    _id: ID
    title: String
    rating: Float
    _createdOn: String
    id: String
    info: Info
  }
  enum sortedValues {
    _createdOn
    _id
    title
    rating
    id
  }

  input MovieSearch {
    limit: Int
    skip: Int
    sortBy: sortedValues
    query: String
  }

  input MovieInput {
    title: String
    rating: Float
    id: String
  }

  type Mutation {
    add(movie: MovieInput): Movie
  }

  type Query {
    all(filter: MovieSearch): [Movie]
    movie(id: String): Movie
  }
`;

// Provide resolver functions for your schema fields
const resolvers = {
  Movie: {
    info: async parent => {
      const imdbID = parent.id;
      const baseImageUrl = "https://image.tmcb.org/t/p";

      const { data } = await axios.get(makeURL(imdbID), {
        headers: {
          "Retry-After": 3600
        }
      });
      const movies = data.movies_results;

      if (!movies.length) {
        return {
          poster_path: null,
          backdrop_path: null,
          release_date: null,
          overview: null
        };
      }
      const movie = movies[0];
      return {
        poster_path: `${baseImageUrl}/w500${movie.poster_path}`,
        backdrop_path: `${baseImageUrl}/original${movie.backdrop_path}`,
        release_date: movie.release_date,
        overview: movie.overview
      };
    }
  },
  Query: {
    all: async (_, args, context) => {
      let url = context.url + "?limit=20";

      if (args.filter) {
        if (args.filter.limit) {
          url = context.url + `?limit=${args.filter.limit}`;
        }

        if (args.filter.sortBy) {
          url = url + `&sort=${args.filter.sortBy}`;
        }

        if (args.filter.skip) {
          url = url + `&skip=${args.filter.skip}`;
        }

        if (args.filter.query) {
          url = url + `&q=title*${args.filter.query}*`;
        }
      }

      const allMovies = await axios.get(url);
      return allMovies.data;
    },
    movie: async (_, args, context) => {
      const id = args.id;
      const movie = await axios.get(`${context.url}/${id}`);

      return movie.data;
    }
  },
  Mutation: {
    add: async (_, args, context) => {
      const movie = args.movie;
      const newMovie = await axios.post(context.url, JSON.stringfly(movie), {
        headers: {
          Accept: "application/json",
          "Content-type": "application/json"
        }
      });

      return newMovie.data;
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: {
    url: "https://legitbackend.wtf/http_63124"
  }
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
