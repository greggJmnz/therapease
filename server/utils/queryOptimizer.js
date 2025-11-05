/**
 * Query Optimization Utilities
 * Uses EXPLAIN to analyze and optimize slow queries
 */

const { pool } = require('../config/database');

class QueryOptimizer {
  /**
   * Analyze query using EXPLAIN
   */
  async explain(sql, params = []) {
    try {
      const explainSql = `EXPLAIN ${sql}`;
      const [results] = await pool.execute(explainSql, params);
      
      return {
        success: true,
        analysis: results,
        recommendations: this._generateRecommendations(results)
      };
    } catch (error) {
      console.error('EXPLAIN query error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze query with detailed format
   */
  async explainExtended(sql, params = []) {
    try {
      const explainSql = `EXPLAIN EXTENDED ${sql}`;
      const [results] = await pool.execute(explainSql, params);
      
      return {
        success: true,
        analysis: results,
        recommendations: this._generateRecommendations(results)
      };
    } catch (error) {
      console.error('EXPLAIN EXTENDED query error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze query execution plan with JSON format
   */
  async explainJson(sql, params = []) {
    try {
      const explainSql = `EXPLAIN FORMAT=JSON ${sql}`;
      const [results] = await pool.execute(explainSql, params);
      
      // MySQL returns JSON as a string, parse it
      const jsonResult = typeof results[0] === 'string' 
        ? JSON.parse(results[0])
        : results[0];
      
      return {
        success: true,
        analysis: jsonResult,
        recommendations: this._generateRecommendationsFromJson(jsonResult)
      };
    } catch (error) {
      console.error('EXPLAIN JSON query error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate recommendations from EXPLAIN results
   */
  _generateRecommendations(results) {
    const recommendations = [];
    
    if (!Array.isArray(results) || results.length === 0) {
      return ['No analysis results available'];
    }

    for (const row of results) {
      // Check for full table scan
      if (row.type === 'ALL') {
        recommendations.push({
          severity: 'high',
          issue: 'Full table scan detected',
          suggestion: `Add an index on columns used in WHERE clause: ${row.key || 'unknown'}`
        });
      }

      // Check for filesort
      if (row.Extra && row.Extra.includes('Using filesort')) {
        recommendations.push({
          severity: 'medium',
          issue: 'Using filesort (temporary sort)',
          suggestion: 'Add index on ORDER BY columns or use indexed columns'
        });
      }

      // Check for temporary table
      if (row.Extra && row.Extra.includes('Using temporary')) {
        recommendations.push({
          severity: 'medium',
          issue: 'Using temporary table',
          suggestion: 'Optimize query to avoid temporary tables, possibly by adding indexes'
        });
      }

      // Check for index usage
      if (row.key === null && row.type !== 'const') {
        recommendations.push({
          severity: 'low',
          issue: 'No index used',
          suggestion: `Consider adding index on: ${row.table || 'unknown table'}`
        });
      }

      // Check for large number of rows examined
      if (row.rows && row.rows > 10000) {
        recommendations.push({
          severity: 'high',
          issue: `Examining ${row.rows} rows`,
          suggestion: 'Add indexes to reduce rows examined'
        });
      }
    }

    return recommendations.length > 0 
      ? recommendations 
      : [{ severity: 'info', issue: 'Query looks good', suggestion: 'No optimization needed' }];
  }

  /**
   * Generate recommendations from JSON format EXPLAIN
   */
  _generateRecommendationsFromJson(jsonResult) {
    const recommendations = [];
    
    if (!jsonResult.query_block) {
      return ['No analysis results available'];
    }

    const analyzeNode = (node) => {
      // Check for full table scan
      if (node.access_type === 'ALL') {
        recommendations.push({
          severity: 'high',
          issue: 'Full table scan detected',
          suggestion: `Add index on table: ${node.table_name || 'unknown'}`
        });
      }

      // Check cost
      if (node.cost_info && node.cost_info.query_cost) {
        const cost = parseFloat(node.cost_info.query_cost);
        if (cost > 1000) {
          recommendations.push({
            severity: 'high',
            issue: `High query cost: ${cost}`,
            suggestion: 'Consider optimizing query with indexes or restructuring'
          });
        }
      }

      // Recursively analyze nested nodes
      if (node.nested_loop) {
        node.nested_loop.forEach(nested => analyzeNode(nested));
      }
    };

    analyzeNode(jsonResult);

    return recommendations.length > 0 
      ? recommendations 
      : [{ severity: 'info', issue: 'Query looks good', suggestion: 'No optimization needed' }];
  }

  /**
   * Analyze multiple queries at once
   */
  async analyzeQueries(queries) {
    const results = [];
    
    for (const query of queries) {
      const { sql, params = [] } = query;
      const analysis = await this.explain(sql, params);
      
      results.push({
        sql,
        params,
        ...analysis
      });
    }

    return results;
  }

  /**
   * Get query performance metrics
   */
  async getQueryMetrics(sql, params = []) {
    const startTime = Date.now();
    
    try {
      const [results] = await pool.execute(sql, params);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        executionTime,
        rowsReturned: results.length,
        slow: executionTime > 1000 // Flag as slow if > 1 second
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }
}

module.exports = new QueryOptimizer();

