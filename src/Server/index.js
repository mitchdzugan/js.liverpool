import fs from 'fs';
import express from 'express';
import DOM from 'gen-impulse/DOM';
import { App } from '../UI/App';

const html = fs.readFileSync('./dist/index.html').toString('utf8');
const server = express();

server.get('/', function (req, res) {
	DOM.toMarkup({}, App).then(({ markup }) => {
		res.send(html.replace('__SSR_CONTENT__', markup));
	});
});

server.use(express.static('public'));
server.use(express.static('dist'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}!`));
