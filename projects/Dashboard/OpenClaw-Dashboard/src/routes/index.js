const express = require('express');
const router = express.Router();

const agentsRoutes = require('./agents');
const tasksRoutes = require('./tasks');
const sessionsRoutes = require('./sessions');
const subagentsRoutes = require('./subagents');
const cronRoutes = require('./cron');
const activityRoutes = require('./activity');
const approvalsRoutes = require('./approvals');
const gatewayRoutes = require('./gateway');
const issuesRoutes = require('./issues');

router.use('/agents', agentsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/subagents', subagentsRoutes);
router.use('/cron', cronRoutes);
router.use('/activity', activityRoutes);
router.use('/approvals', approvalsRoutes);
router.use('/gateway', gatewayRoutes);
router.use('/issues', issuesRoutes);

module.exports = router;
