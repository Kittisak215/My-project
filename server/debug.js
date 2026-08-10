try {
    require('./src/index.js');
} catch (e) {
    require('fs').writeFileSync('crash.log', e.stack);
}
