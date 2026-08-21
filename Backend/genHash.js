const bcrypt = require('bcrypt');

const password = 'admin123'; // Ganti dengan password yang ingin di-hash
bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(hash);
});