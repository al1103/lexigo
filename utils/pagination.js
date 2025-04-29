/**
 * Creates a generic pagination function to use with SQL queries
 * @param {Object} options - Pagination options
 * @param {Number} options.page - Current page (default: 1)
 * @param {Number} options.limit - Items per page (default: 10)
 * @param {String} options.sortBy - Column to sort by (default: 'id')
 * @param {String} options.sortOrder - Sort order (asc/desc) (default: 'asc')
 * @returns {Object} Pagination parameters
 */
function createPagination(options = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = options.limit || 10;
  const offset = (page - 1) * limit;
  const sortBy = options.sortBy || "id";
  const sortOrder = options.sortOrder || "asc";

  return {
    page,
    limit,
    offset,
    sortBy,
    sortOrder,
    getPaginationData: function (totalItems) {
      const totalPages = Math.ceil(totalItems / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: totalItems,
        totalPages: totalPages,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
      };
    },
  };
}

function getPaginationParams(req) {
  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || "created_at";
  const sortOrder = (req.query.sortOrder || "DESC").toUpperCase();

  // Sanitize inputs
  page = Math.max(1, page);
  limit = Math.max(1, Math.min(100, limit));

  return { page, limit, sortBy, sortOrder, offset: (page - 1) * limit };
}

module.exports = { createPagination, getPaginationParams };
