const morgan = require('morgan');
const express = require('express'); 
const app = express();
const port = 3000;
const cors = require('cors');
app.use(cors());
const mongoose = require('mongoose');

app.use(morgan('dev'));
app.use(express.json());

mongoose.connect("mongodb+srv://root:root@cluster0.dvhk9mj.mongodb.net/?retryWrites=true&w=majority")
.then(()=>{
    console.log("Conectado correctamente a MongoDB");
})
.catch((error)=>{
    console.log("Error al conectar con MongoDB: ", error);
});
//Proyecto Final Enfocado a el manejo de una aplicacion de hoteles y reservaciones tipo trivago en MongoDB
// Hoteles, Reservaciones, Usuarios, Comentarios, Habitaciones
// Definimos el esquema para la colección de hoteles
app.get('/', (req, res) => {
  res.send('Bienvenido a la API de Hoteles y Reservaciones');
});

const hotelSchema = new mongoose.Schema(
    {
        nombre: {type: String, required: true},
        ubicacion: {type: String, required: true},
        estrellas: {type: Number, required: true},
        precio: {type: Number, required: true},
        disponibilidad: {type: Boolean, required: true}
    },
    { timestamps: true }
);
const Hotel = mongoose.model('Hotel', hotelSchema, 'hoteles');

// Definimos el esquema para la colección de reservaciones
const reservacionSchema = new mongoose.Schema(
    {
        hotelId: {type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true},
        usuario: {type: String, required: true},
        fechaEntrada: {type: Date, required: true},
        fechaSalida: {type: Date, required: true},
        numeroPersonas: {type: Number, required: true}
    },
    { timestamps: true }
);
const Reservacion = mongoose.model('Reservacion', reservacionSchema, 'reservaciones');

// Definimos el esquema para la colección de usuarios
const usuarioSchema = new mongoose.Schema(
    {
        nombre: {type: String, required: true},
        email: {type: String, required: true, unique: true},
        password: {type: String, required: true}
    },
    { timestamps: true }
);
const Usuario = mongoose.model('Usuario', usuarioSchema, 'usuarios');

// Definimos el esquema para la colección de comentarios
const comentarioSchema = new mongoose.Schema(
    {
        hotelId: {type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true},
        usuario: {type: String, required: true},
        comentario: {type: String, required: true},
        calificacion: {type: Number, required: true}
    },
    { timestamps: true }
);
const Comentario = mongoose.model('Comentario', comentarioSchema, 'comentarios');

// Definimos el esquema para la colección de habitaciones
const habitacionSchema = new mongoose.Schema(
    {
        hotelId: {type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true},
        tipo: {type: String, required: true},
        precio: {type: Number, required: true},
        disponibilidad: {type: Boolean, required: true}
    },
    { timestamps: true }
);
const Habitacion = mongoose.model('Habitacion', habitacionSchema, 'habitaciones');


app.listen(port, () => {
  console.log(`Server corriendo en http://localhost:${port}`);
});