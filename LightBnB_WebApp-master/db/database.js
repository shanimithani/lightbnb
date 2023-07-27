console.log('test');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

const properties = require("./json/properties.json");
const users = require("./json/users.json");

pool.query(`SELECT title FROM properties LIMIT 10;`).then(response => {console.log(response)})


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
 const getUserWithEmail = function (email) {
  return pool
    .query(`SELECT * FROM users WHERE email = $1`, [email])
    .then((result) => {
      return result.rows[0]; // Assuming the email is unique and only one user is returned
    })
    .catch((err) => {
      console.log(err.message);
      return null; 
    });
};
/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
 const getUserWithId = function (id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1`, [id])
    .then((result) => {
      return result.rows[0]; // Assuming the ID is unique and only one user is returned
    })
    .catch((err) => {
      console.log(err.message);
      return null; 
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
 const addUser = function (user) {
  const { name, email, password } = user;
  return pool
    .query(
      `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *`,
      [name, email, password]
    )
    .then((result) => {
      return result.rows[0]; // Return the newly added user object from the database
    })
    .catch((err) => {
      console.log(err.message);
      return null;
    });
};


/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
 const getAllReservations = function (guest_id, limit = 10) {
  // Connected to reservations 
  const query = `
    SELECT reservations.*,
           properties.*,
           AVG(property_reviews.rating) AS average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    LEFT JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    AND end_date < NOW()::date
    GROUP BY reservations.id, properties.id
    ORDER BY start_date
    LIMIT $2;
  `;

  const values = [guest_id, limit];

  return pool.query(query, values)
    .then(result => result.rows)
    .catch(error => {
      console.error('Error fetching reservations:', error);
      return [];
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
/**const getAllProperties = function (options, limit = 10) {
  const limitedProperties = {};
  for (let i = 1; i <= limit; i++) {
    limitedProperties[i] = properties[i];
  }
  return Promise.resolve(limitedProperties);
}; */

const getAllProperties = function (options, limit = 10) {
  const queryParams = [];
  let queryString = `
    SELECT properties.*, AVG(property_reviews.rating) AS average_rating
    FROM properties
    LEFT JOIN property_reviews ON properties.id = property_id
  `;

  // Handle the filters
  const filters = [];

  // Check if an owner_id is passed in and add it to the filters
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    filters.push(`properties.owner_id = $${queryParams.length}`);
  }

  // Check if minimum_price_per_night and maximum_price_per_night are passed in
  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night);
    filters.push(`properties.cost_per_night >= $${queryParams.length}`);
  }
  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night);
    filters.push(`properties.cost_per_night <= $${queryParams.length}`);
  }

  // Check if minimum_rating is passed in
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    filters.push(`property_reviews.rating >= $${queryParams.length}`);
  }

  if (filters.length > 0) {
    queryString += `WHERE ${filters.join(' AND ')} `;
  }


  queryParams.push(limit);
  queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
  `;

  return pool.query(queryString, queryParams)
    .then((res) => res.rows)
    .catch((error) => {
      console.error('Error fetching properties:', error);
      return [];
    });
};


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A 
 * promise to the property.
 */
 const addProperty = function (property) {
  //  query parameters
  const queryParams = [
    property.owner_id,
    property.title,
    property.description,
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.cost_per_night,
    property.street,
    property.city,
    property.province,
    property.post_code,
    property.country,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms,
  ];

  // Construct the query string 
  const queryString = `
    INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;
  `;

  return pool.query(queryString, queryParams)
    .then((res) => res.rows[0])
    .catch((error) => {
      console.error('Error adding property:', error);
      return null;
    });
};






module.exports = {
  pool, // Export  pool object 
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations
};