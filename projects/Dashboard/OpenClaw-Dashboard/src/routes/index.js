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
const commandRoutes = require('./command');
const spawnRoutes = require('./spawn');
const resultsRoutes = require('./results');

router.use('/agents', agentsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/subagents', subagentsRoutes);
router.use('/cron', cronRoutes);
router.use('/activity', activityRoutes);
router.use('/approvals', approvalsRoutes);
router.use('/gateway', gatewayRoutes);
router.use('/issues/results', resultsRoutes);
router.use('/issues', issuesRoutes);
router.use('/command', commandRoutes);
router.use('/spawn', spawnRoutes);

module.exports = router;
