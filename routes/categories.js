const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all categories
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order';
    db.all(sql, [], (err, categories) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching categories',
                error: err.message
            });
        }
        res.json({
            success: true,
            data: categories
        });
    });
});

// Get category by ID
router.get('/:id', (req, res) => {
    const sql = 'SELECT * FROM categories WHERE id = ? AND is_active = 1';
    db.get(sql, [req.params.id], (err, category) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching category',
                error: err.message
            });
        }
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        res.json({
            success: true,
            data: category
        });
    });
});

// Create new category
router.post('/', (req, res) => {
    const { name, description, icon, color, sort_order } = req.body;
    const sql = `INSERT INTO categories (name, description, icon, color, sort_order)
                VALUES (?, ?, ?, ?, ?)`;

    db.run(sql, [name, description, icon, color, sort_order], function(err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error creating category',
                error: err.message
            });
        }
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: { id: this.lastID }
        });
    });
});

// Update category
router.put('/:id', (req, res) => {
    const { name, description, icon, color, sort_order, is_active } = req.body;
    const sql = `UPDATE categories
                SET name = ?, description = ?, icon = ?,
                    color = ?, sort_order = ?, is_active = ?
                WHERE id = ?`;

    db.run(sql, [name, description, icon, color, sort_order, is_active, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error updating category',
                    error: err.message
                });
            }
            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }
            res.json({
                success: true,
                message: 'Category updated successfully'
            });
    });
});

// Delete category
router.delete('/:id', (req, res) => {
    const sql = 'UPDATE categories SET is_active = 0 WHERE id = ?';
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error deleting category',
                error: err.message
            });
        }
        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    });
});

module.exports = router;
