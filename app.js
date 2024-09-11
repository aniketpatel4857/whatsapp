const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);
const mongoose = require('mongoose');
const User = require('./models/user');
const Message = require('./models/message');

// MongoDB connection
mongoose.connect('mongodb+srv://aniketpatel485772:aniket@cluster0.svxmrel.mongodb.net/chats', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Express setup
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Entry form route
app.get('/', (req, res) => {
  res.render('index');
});

app.post('/enter', async (req, res) => {
  const { username } = req.body;
  let user = await User.findOne({ username });
  if (!user) {
    user = new User({ username });
    await user.save();
  }
  res.redirect(`/chats/${user._id}`);
});

// Chats page route
app.get('/chats/:userId', async (req, res) => {
  const currentUser = await User.findById(req.params.userId);
  const users = await User.find({ _id: { $ne: currentUser._id } }); // Exclude current user from list
  res.render('chats', { currentUser, users });
});

// Chat route between users
app.get('/chat/:currentUserId/:otherUserId', async (req, res) => {
  const currentUser = await User.findById(req.params.currentUserId);
  const otherUser = await User.findById(req.params.otherUserId);
  const messages = await Message.find({
    $or: [
      { sender: currentUser._id, receiver: otherUser._id },
      { sender: otherUser._id, receiver: currentUser._id }
    ]
  }).sort('createdAt');
  res.render('chat', { currentUser, otherUser, messages });
});

// Socket.io for real-time communication
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(userId);
  });

  socket.on('private message', async ({ sender, receiver, message }) => {
    const newMessage = new Message({ sender, receiver, message });
    await newMessage.save();
    
    io.to(receiver).emit('private message', newMessage);
    io.to(sender).emit('private message', newMessage); // Show sender their message too
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
