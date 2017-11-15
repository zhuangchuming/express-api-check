'use strict';

const express = require('express');
const router = express.Router();

//从这里开始使用接口检测功能
router.use(require('express-api-check').JustifyReq);
router.use('/user',require('./user/register'));
router.use('/user',require('./user/login'));
router.use('/api',require('./api/edit'));
router.use(require('../../index').onError);
router.use(require('express-api-check').onError);

module.exports = router;
