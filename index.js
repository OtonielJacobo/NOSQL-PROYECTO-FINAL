const morgan = require('morgan');
const express = require('express'); 
const app = express();
const port = 3000;
const cors = require('cors');
app.use(cors());
const mongoose = require('mongoose');

app.use(morgan('dev'));
app.use(express.json());

mongoose.connect("mongodb://root:root@ac-pjzthry-shard-00-00.dvhk9mj.mongodb.net:27017,ac-pjzthry-shard-00-01.dvhk9mj.mongodb.net:27017,ac-pjzthry-shard-00-02.dvhk9mj.mongodb.net:27017/?ssl=true&replicaSet=atlas-3hidp3-shard-0&authSource=admin&appName=Cluster0")
.then(()=>{
    console.log("Conectado correctamente a MongoDB");
})
.catch((error)=>{
    console.log("Error al conectar con MongoDB: ", error);
});
//Proyecto Final Enfocado a el manejo de una aplicacion de hoteles y reservaciones tipo trivago en MongoDB
// Hoteles, Reservaciones, Clientes, Comentarios, Habitaciones
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
        cliente: {type: String, required: true},
        fechaEntrada: {type: Date, required: true},
        fechaSalida: {type: Date, required: true},
        numeroPersonas: {type: Number, required: true}
    },
    { timestamps: true }
);
const Reservacion = mongoose.model('Reservacion', reservacionSchema, 'reservaciones');

// Definimos el esquema para la colección de clientes
const clienteSchema = new mongoose.Schema(
    {
        nombre: {type: String, required: true},
        email: {type: String, required: true, unique: true},
        password: {type: String, required: true}
    },
    { timestamps: true }
);
const Cliente = mongoose.model('Cliente', clienteSchema, 'clientes');

app.get('/clientes', async (req, res) => {
    try {
        const clientes = await Cliente.find();
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/clientes', async (req, res) => {
    const cliente = new Cliente({
        nombre: req.body.nombre,
        email: req.body.email,
        password: req.body.password
    });
    try {
        const guardadoCliente = await cliente.save();
        res.status(201).json(guardadoCliente);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/clientes/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        cliente.nombre = req.body.nombre || cliente.nombre;
        cliente.email = req.body.email || cliente.email;
        cliente.password = req.body.password || cliente.password;
        const actualizadoCliente = await cliente.save();
        res.json(actualizadoCliente);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/clientes/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        await cliente.remove();
        res.json({ message: 'Cliente eliminado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Definimos el esquema para la colección de comentarios
const comentarioSchema = new mongoose.Schema(
    {
        hotelId: {type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true},
        cliente: {type: String, required: true},
        comentario: {type: String, required: true},
        calificacion: {type: Number, required: true}
    },
    { timestamps: true }
);
const Comentario = mongoose.model('Comentario', comentarioSchema, 'comentarios');

app.get('/comentarios', async (req, res) => {
    try {
        const comentarios = await Comentario.find();
        res.json(comentarios);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/comentarios', async (req, res) => {
    const comentario = new Comentario({
        hotelId: req.body.hotelId,
        cliente: req.body.cliente,
        comentario: req.body.comentario,
        calificacion: req.body.calificacion
    });
    try {
        const guardadoComentario = await comentario.save();
        res.status(201).json(guardadoComentario);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/comentarios/:id', async (req, res) => {
    try {
        const comentario = await Comentario.findById(req.params.id);
        if (!comentario) {
            return res.status(404).json({ message: 'Comentario no encontrado' });
        }
        comentario.hotelId = req.body.hotelId || comentario.hotelId;
        comentario.cliente = req.body.cliente || comentario.cliente;
        comentario.comentario = req.body.comentario || comentario.comentario;
        comentario.calificacion = req.body.calificacion || comentario.calificacion;
        const actualizadoComentario = await comentario.save();
        res.json(actualizadoComentario);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/comentarios/:id', async (req, res) => {
    try {
        const comentario = await Comentario.findById(req.params.id);
        if (!comentario) {
            return res.status(404).json({ message: 'Comentario no encontrado' });
        }
        await comentario.remove();
        res.json({ message: 'Comentario eliminado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

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

app.get('/habitaciones', async (req, res) => {
    try {
        const habitaciones = await Habitacion.find();
        res.json(habitaciones);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/habitaciones', async (req, res) => {
    const habitacion = new Habitacion({
        hotelId: req.body.hotelId,
        tipo: req.body.tipo,
        precio: req.body.precio,
        disponibilidad: req.body.disponibilidad
    });
    try {
        const guardadaHabitacion = await habitacion.save();
        res.status(201).json(guardadaHabitacion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/habitaciones/:id', async (req, res) => {
    try {
        const habitacion = await Habitacion.findById(req.params.id);
        if (!habitacion) {
            return res.status(404).json({ message: 'Habitación no encontrada' });
        }
        habitacion.hotelId = req.body.hotelId || habitacion.hotelId;
        habitacion.tipo = req.body.tipo || habitacion.tipo;
        habitacion.precio = req.body.precio || habitacion.precio;
        habitacion.disponibilidad = req.body.disponibilidad || habitacion.disponibilidad;
        const actualizadaHabitacion = await habitacion.save();
        res.json(actualizadaHabitacion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/habitaciones/:id', async (req, res) => {
    try {
        const habitacion = await Habitacion.findById(req.params.id);
        if (!habitacion) {
            return res.status(404).json({ message: 'Habitación no encontrada' });
        }
        await habitacion.remove();
        res.json({ message: 'Habitación eliminada' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


app.listen(port, () => {
  console.log(`Server corriendo en http://localhost:${port}`);
});