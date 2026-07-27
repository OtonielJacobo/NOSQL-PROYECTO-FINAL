const morgan = require('morgan');
const express = require('express'); 
const app = express();
const port = 3000;
const cors = require('cors');
app.use(cors());
const mongoose = require('mongoose');

app.use(morgan('dev'));
app.use(express.json());
app.use(express.static('frontend'));

mongoose.connect("mongodb://root:root@ac-pjzthry-shard-00-00.dvhk9mj.mongodb.net:27017,ac-pjzthry-shard-00-01.dvhk9mj.mongodb.net:27017,ac-pjzthry-shard-00-02.dvhk9mj.mongodb.net:27017/Hotel?ssl=true&replicaSet=atlas-3hidp3-shard-0&authSource=admin&appName=Cluster0")
.then(()=>{
    console.log("Conectado correctamente a MongoDB");
})
.catch((error)=>{
    console.log("Error al conectar con MongoDB: ", error);
});
//Proyecto Final Enfocado a el manejo de una aplicacion de hoteles y reservaciones tipo trivago en MongoDB
// Hoteles, Reservaciones, Usuarios, Comentarios, Habitaciones
app.get('/', (req, res) => {
  res.send('Bienvenido a la API de Hoteles y Reservaciones');
});

// Definimos el esquema para la colección de hoteles
const hotelSchema = new mongoose.Schema(
    {
        nombre: {type: String, required: true},
        ubicacion: {type: String, required: true},
        estrellas: {type: Number, required: true},
    },
    { timestamps: true }
);
const Hotel = mongoose.model('Hotel', hotelSchema, 'hoteles');

// Definimos el esquema para la colección de reservaciones
const reservacionSchema = new mongoose.Schema(
    {
        hotelId: {type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true},
        habitacionId: {type: mongoose.Schema.Types.ObjectId, ref: 'Habitacion', required: true},
        clienteId: {type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true},
        fechaEntrada: {type: Date, required: true},
        fechaSalida: {
            type: Date,
            required: true,
            validate: {
                validator(value) { return value > this.fechaEntrada; },
                message: 'La fecha de salida debe ser posterior a la fecha de entrada'
            }
        },
        numeroPersonas: {type: Number, required: true}
    },
    { timestamps: true }
);
//metodos get, post y delete para la coleccion de reservaciones
app.get('/reservaciones', async (req, res) => {
    try {
        const reservaciones = await Reservacion.find()
            .populate('hotelId habitacionId clienteId');
        res.json(reservaciones);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/reservaciones/:id', async (req, res) => {
    try {
        const reservacion = await Reservacion.findById(req.params.id)
            .populate('hotelId habitacionId clienteId');
        if (!reservacion) {
            return res.status(404).json({ message: 'Reservación no encontrada' });
        }
        res.json(reservacion);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/reservaciones', async (req, res) => {
    try {
        await validarReferenciasReservacion(req.body);
        const reservacion = new Reservacion(req.body);
        const guardarReservacion = await reservacion.save();
        res.status(201).json(guardarReservacion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/reservaciones/:id', async (req, res) => {
    try {
        const reservacion = await Reservacion.findById(req.params.id);
        if (!reservacion) {
            return res.status(404).json({ message: 'Reservación no encontrada' });
        }
        reservacion.hotelId = req.body.hotelId ?? reservacion.hotelId;
        reservacion.habitacionId = req.body.habitacionId ?? reservacion.habitacionId;
        reservacion.clienteId = req.body.clienteId ?? reservacion.clienteId;
        reservacion.fechaEntrada = req.body.fechaEntrada ?? reservacion.fechaEntrada;
        reservacion.fechaSalida = req.body.fechaSalida ?? reservacion.fechaSalida;
        reservacion.numeroPersonas = req.body.numeroPersonas ?? reservacion.numeroPersonas;
        await validarReferenciasReservacion(reservacion);
        const actualizarReservacion = await reservacion.save();
        res.json(actualizarReservacion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/reservaciones/:id', async (req, res) => {
    try {
        const reservacion = await Reservacion.findByIdAndDelete(req.params.id);
        res.json({ message: 'Reservación eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

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

app.get('/clientes/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        res.json(cliente);
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
        await Cliente.findByIdAndDelete(req.params.id);
        res.json({ message: 'Cliente eliminado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Definimos el esquema para la colección de comentarios
const comentarioSchema = new mongoose.Schema(
    {
        hotelId: {type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true},
        clienteId: {type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true},
        comentario: {type: String, required: true},
        calificacion: {type: Number, required: true}
    },
    { timestamps: true }
);
const Comentario = mongoose.model('Comentario', comentarioSchema, 'comentarios');

app.get('/comentarios', async (req, res) => {
    try {
        const comentarios = await Comentario.find().populate('hotelId clienteId');
        res.json(comentarios);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/comentarios/:id', async (req, res) => {
    try {
        const comentario = await Comentario.findById(req.params.id).populate('hotelId clienteId');
        if (!comentario) {
            return res.status(404).json({ message: 'Comentario no encontrado' });
        }
        res.json(comentario);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/comentarios', async (req, res) => {
    const comentario = new Comentario({
        hotelId: req.body.hotelId,
        clienteId: req.body.clienteId,
        comentario: req.body.comentario,
        calificacion: req.body.calificacion
    });
    try {
        await validarReferenciasComentario(comentario);
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
        comentario.hotelId = req.body.hotelId ?? comentario.hotelId;
        comentario.clienteId = req.body.clienteId ?? comentario.clienteId;
        comentario.comentario = req.body.comentario ?? comentario.comentario;
        comentario.calificacion = req.body.calificacion ?? comentario.calificacion;
        await validarReferenciasComentario(comentario);
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
        await Comentario.findByIdAndDelete(req.params.id);
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

// Verificamos que las referencias apunten a documentos existentes y relacionados.
async function validarReferenciasReservacion({ hotelId, habitacionId, clienteId }) {
    const [hotel, habitacion, cliente] = await Promise.all([
        Hotel.findById(hotelId),
        Habitacion.findById(habitacionId),
        Cliente.findById(clienteId)
    ]);

    if (!hotel) throw new Error('El hotel indicado no existe');
    if (!habitacion) throw new Error('La habitacion indicada no existe');
    if (!cliente) throw new Error('El cliente indicado no existe');
    if (String(habitacion.hotelId) !== String(hotel._id)) {
        throw new Error('La habitacion no pertenece al hotel indicado');
    }
}

async function validarReferenciasComentario({ hotelId, clienteId }) {
    const [hotel, cliente] = await Promise.all([
        Hotel.findById(hotelId),
        Cliente.findById(clienteId)
    ]);
    if (!hotel) throw new Error('El hotel indicado no existe');
    if (!cliente) throw new Error('El cliente indicado no existe');
}

async function validarHotelHabitacion(hotelId) {
    if (!await Hotel.exists({ _id: hotelId })) {
        throw new Error('El hotel indicado no existe');
    }
}

app.post("/hoteles", async (req, res) => {
    try {
        const nuevoHotel = new Hotel(req.body); // ponytail: trust schema validation
        const hotelGuardado = await nuevoHotel.save();

        res.status(201).json({
            mensaje: "Hotel registrado correctamente",
            hotel: hotelGuardado,
        });
    } catch(error) {
        res.status(400).json({
            mensaje: "Error al guardar hotel",
            error: error.message,
        });
    }
});

app.get("/hoteles", async (req, res) => {
    try {
        res.json(await Hotel.find())
    } catch (error) {
        res.status(500).json({
            mensaje: "Error al obtener los hoteles",
            error: error,
        });
    }
});

app.get("/hoteles/:id", async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id)

        if (!hotel) {
            return res.status(404).json({
                mensaje: "Hotel no encontrado",
            });
        }

        res.json(hotel);
    } catch (error) {
        res.status(500).json({
            mensaje: "Error al obtener hotel",
            error: error.message,
        });
    }
})

app.put("/hoteles/:id", async (req, res) => {
    try {
        const hotelActualizado = await Hotel.findByIdAndUpdate(
            req.params.id, 
            req.body,
            {new: true, runValidators: true},
        );

        if (!hotelActualizado) {
            return res.status(404).json({
                mensaje: "Hotel no encontrado",
            });
        }

        res.json({
            mensaje: "Hotel actualizado correctamente",
            hotel: hotelActualizado,
        });
    } catch (error) {
        res.status(400).json({
            mensaje: "Error al actualizar hotel",
            error: error.message,
        });
    }
})

app.delete("/hoteles/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const hotelEliminado = await Hotel.findByIdAndDelete(id);

    if (!hotelEliminado) {
      return res.status(404).json({
        mensaje: "Hotel no encontrado",
      });
    }

    res.json({
      mensaje: "Hotel eliminado correctamente",
      hotel: hotelEliminado,
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al eliminar Hotel",
      error: error.message,
    });
  }
});
app.get('/habitaciones', async (req, res) => {
    try {
        const habitaciones = await Habitacion.find();
        res.json(habitaciones);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/habitaciones/:id', async (req, res) => {
    try {
        const habitacion = await Habitacion.findById(req.params.id);
        if (!habitacion) {
            return res.status(404).json({ message: 'Habitación no encontrada' });
        }
        res.json(habitacion);
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
        await validarHotelHabitacion(habitacion.hotelId);
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
        habitacion.hotelId = req.body.hotelId ?? habitacion.hotelId;
        habitacion.tipo = req.body.tipo ?? habitacion.tipo;
        habitacion.precio = req.body.precio ?? habitacion.precio;
        habitacion.disponibilidad = req.body.disponibilidad ?? habitacion.disponibilidad;
        await validarHotelHabitacion(habitacion.hotelId);
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
        await Habitacion.findByIdAndDelete(req.params.id);
        res.json({ message: 'Habitación eliminada' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


app.listen(port, () => {
  console.log(`Server corriendo en http://localhost:${port}`);
});
