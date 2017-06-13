let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let userSchema = new Schema({
    username: String,
    password: String,
    email: String,
    createTime: {
        type: Date,
        default: Date.now
    }
});

let noteSchema = new Schema({
    title: String,
    author: String,
    tag: String,
    content: String,
    createTime: {
        type: Date,
        default: Date.now
    }
});

exports.Note = mongoose.model("Note", noteSchema);
exports.User = mongoose.model("User", userSchema);
