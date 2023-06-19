const mongoose = require('mongoose');
const {Schema, model} = mongoose;

const BlogPostSchema = new Schema({
    title: String,
    summary: String,
    content: String,
    cover: String,
    author: {type:Schema.Types.ObjectId, ref:'User'}
},{
    timestamps:true
})

const BlogPostModel = model('BlogPost', BlogPostSchema);

module.exports = BlogPostModel