const express = require('express');
const {urlencoded, json} = require('express');
const router = require('./routes/goldsports.routes');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(urlencoded({extended: true}))
app.use(json())

app.use(cors())
app.use('/v1/goldSports', router);


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));