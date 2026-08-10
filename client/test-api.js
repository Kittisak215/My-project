const axios = require('axios');
(async () => {
    try {
        const login = await axios.post('http://localhost:5000/api/auth/login', { username: 'admin', password: 'admin123' });
        const token = login.data.token;
        const users = await axios.get('http://localhost:5000/api/users', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Success:", users.data);
    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
})();
