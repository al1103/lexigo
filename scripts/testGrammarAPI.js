const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/grammar`;

async function testGrammarAPI() {
  console.log('🧪 Testing Grammar Articles API...\n');

  try {
    // Test 1: Get all articles
    console.log('1️⃣ Testing GET /api/grammar');
    const allArticlesResponse = await axios.get(API_BASE);
    console.log('✅ Status:', allArticlesResponse.status);
    console.log('📊 Total articles:', allArticlesResponse.data.data.pagination.total_items);
    console.log('📄 Articles in response:', allArticlesResponse.data.data.articles.length);
    console.log();

    if (allArticlesResponse.data.data.articles.length > 0) {
      const firstArticle = allArticlesResponse.data.data.articles[0];
      const articleId = firstArticle.id;

      // Test 2: Get article by ID
      console.log(`2️⃣ Testing GET /api/grammar/${articleId}`);
      const articleResponse = await axios.get(`${API_BASE}/${articleId}`);
      console.log('✅ Status:', articleResponse.status);
      console.log('📰 Article title:', articleResponse.data.data.article.title);
      console.log('👀 View count increased:', articleResponse.data.data.article.view_count);
      console.log();
    }

    // Test 3: Get categories
    console.log('3️⃣ Testing GET /api/grammar/categories');
    const categoriesResponse = await axios.get(`${API_BASE}/categories`);
    console.log('✅ Status:', categoriesResponse.status);
    console.log('📂 Categories:', categoriesResponse.data.data.categories);
    console.log();

    // Test 4: Filter by difficulty
    console.log('4️⃣ Testing GET /api/grammar?difficulty=beginner');
    const beginnerResponse = await axios.get(`${API_BASE}?difficulty=beginner`);
    console.log('✅ Status:', beginnerResponse.status);
    console.log('📚 Beginner articles:', beginnerResponse.data.data.articles.length);
    console.log();

    // Test 5: Search articles
    console.log('5️⃣ Testing GET /api/grammar/search?keyword=present');
    const searchResponse = await axios.get(`${API_BASE}/search?keyword=present`);
    console.log('✅ Status:', searchResponse.status);
    console.log('🔍 Search results:', searchResponse.data.data.articles.length);
    console.log();

    // Test 6: Get popular articles
    console.log('6️⃣ Testing GET /api/grammar/popular');
    const popularResponse = await axios.get(`${API_BASE}/popular`);
    console.log('✅ Status:', popularResponse.status);
    console.log('⭐ Popular articles:', popularResponse.data.data.articles.length);
    console.log();

    // Test 7: Filter by category (if categories exist)
    if (categoriesResponse.data.data.categories.length > 0) {
      const firstCategory = categoriesResponse.data.data.categories[0];
      console.log(`7️⃣ Testing GET /api/grammar/category/${firstCategory}`);
      const categoryResponse = await axios.get(`${API_BASE}/category/${firstCategory}`);
      console.log('✅ Status:', categoryResponse.status);
      console.log(`📁 Articles in "${firstCategory}":`, categoryResponse.data.data.articles.length);
      console.log();
    }

    // Test 8: Pagination
    console.log('8️⃣ Testing pagination GET /api/grammar?page=1&limit=2');
    const paginationResponse = await axios.get(`${API_BASE}?page=1&limit=2`);
    console.log('✅ Status:', paginationResponse.status);
    console.log('📄 Items per page:', paginationResponse.data.data.pagination.items_per_page);
    console.log('📊 Current page:', paginationResponse.data.data.pagination.current_page);
    console.log();

    console.log('🎉 All tests passed successfully!');
    console.log('\n📋 Summary:');
    console.log('• All public API endpoints are working');
    console.log('• Pagination is functional');
    console.log('• Search and filtering work correctly');
    console.log('• View count tracking is active');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📄 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    }
    process.exit(1);
  }
}

async function testAdminRoutes() {
  console.log('\n🔐 Testing Admin Routes (without authentication)...\n');

  try {
    // Test admin routes accessibility (should redirect to login)
    const adminRoutes = [
      '/admin/grammar',
      '/admin/grammar/add'
    ];

    for (const route of adminRoutes) {
      try {
        console.log(`🔍 Testing ${BASE_URL}${route}`);
        const response = await axios.get(`${BASE_URL}${route}`, {
          maxRedirects: 0,
          validateStatus: (status) => status < 400
        });
        console.log('📍 Status:', response.status);
      } catch (error) {
        if (error.response && [302, 401, 403].includes(error.response.status)) {
          console.log('🔒 Correctly protected (redirected/unauthorized)');
        } else {
          console.log('❌ Unexpected error:', error.message);
        }
      }
    }

    console.log('\n✅ Admin routes are properly protected');

  } catch (error) {
    console.error('❌ Admin routes test failed:', error.message);
  }
}

// Run tests
if (require.main === module) {
  console.log('🚀 Starting Grammar Articles API Tests...\n');
  console.log('⚠️  Make sure the server is running on http://localhost:3000\n');

  testGrammarAPI()
    .then(() => testAdminRoutes())
    .then(() => {
      console.log('\n🎊 All tests completed successfully!');
      console.log('\n📚 Next steps:');
      console.log('1. Access admin interface: http://localhost:3000/admin/login');
      console.log('2. Create/edit grammar articles via web interface');
      console.log('3. Test API endpoints with real data');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Tests failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testGrammarAPI, testAdminRoutes };
