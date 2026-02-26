import express from 'express';
import noteRouter from './routes/notes.js';
import mongoose from 'mongoose';

const app = express();

app.use(express.json()); 

app.use('/notes', noteRouter);

app.get('/', (req, res) => {
    res.send('hello world');
});

// Contoh route dengan path parameter yang benar
app.get('/say/:greeting', (req, res) => {
    const { greeting } = req.params;
    res.send(greeting);
});

// Error handling middleware
app.use((err, req, res, next) => {
    res.status(500).json({
        result: 'fail',
        error: err.message,
    });
});

mongoose.connect('mongodb+srv://kmediario13_db_user:alena@cluster0.xf879y1.mongodb.net/my_database?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log('✅ Terhubung ke MongoDB Atlas!'))
    .catch((err) => console.error('❌ Gagal konek:', err));

app.listen(3000, () => {
    console.log('Server jalan di http://localhost:3000');
});

//import express from 'express';
//import noteRouter from './routes/notes.js';

//const app = express()

//app.use('/notes', noteRouter);

//app.use (express.json());

//app.use((req, res, next)=> {    //midellware security, quality || use untuk universal
//    if (!true(req)){
//        next(new Error('Not Authorized'));   //next ada argumen: melemar ke error handling
//        return;
//    }
//    next();
//});

//app.get('/',(req, res)=>{
//    res.send ('hello word')
//});

//app.get('/admin', (req, res) => {
//    res.status(401).send('Gak boleh masuk! ELO BUKAN MOMAA!!');
//});

//app.get('/say/:moma', (req, res) => {
//    res.send ('ELO MOMAA!!')
//});

//app.get('/say:greeting', (req, res) => { //path paramather yg ada /:
//    const { greeting } = req.params;
//    res.send(greeting);
//});


//app.use((err,req,res,next)=>{    //midellware error handling
//    res.send('Error Occurred')
//});

//app.use((err, req, res, next) => {
//    console.error(err.stack);
//    res.status(err.status || 500).json({
//        result: 'fail',
//        error: err.message || 'Internal Server Error',
//    });
//});

//app.listen(3000, () => {
//    console.log('Server jalan di http://localhost:3000');
//});
