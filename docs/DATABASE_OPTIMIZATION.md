# Database Optimization Guide

This document describes the database optimizations implemented in TherapEase:

## 1. Connection Pooling

The application uses `mysql2.createPool()` instead of `createConnection()` for better performance and resource management.

### Configuration
- **Production**: 20 concurrent connections
- **Development**: 10 concurrent connections
- **Idle Timeout**: 5 minutes
- **Auto-reconnect**: Enabled

### Usage
```javascript
const { pool, getAll, getRow, runQuery } = require('../config/database');

// All helper functions automatically use the pool
const users = await getAll('SELECT * FROM users WHERE role = ?', ['patient']);
```

## 2. In-Memory Query Caching

Frequent queries can be cached to reduce database load.

### Cache Features
- **TTL-based expiration**: Default 5 minutes
- **Automatic eviction**: LRU-style when cache is full (max 1000 entries)
- **Statistics tracking**: Hit rate, misses, evictions
- **Automatic cleanup**: Expired entries cleaned every 5 minutes

### Usage

#### Basic Caching
```javascript
const { getAll, getRow } = require('../config/database');

// Cache for 5 minutes (default)
const patients = await getAll(
  'SELECT * FROM patients WHERE status = ?',
  ['active'],
  { useCache: true }
);

// Cache with custom TTL (10 minutes)
const user = await getRow(
  'SELECT * FROM users WHERE id = ?',
  [userId],
  { useCache: true, cacheTTL: 10 * 60 * 1000 }
);
```

#### Cache Invalidation
```javascript
const queryCache = require('../utils/queryCache');

// Invalidate cache for specific pattern
queryCache.invalidate('SELECT * FROM patients');

// Clear all cache
queryCache.clear();

// Get cache statistics
const stats = queryCache.getStats();
console.log(`Hit rate: ${stats.hitRate}`);
```

### When to Use Caching
✅ **Good candidates for caching:**
- System settings (rarely change)
- User roles and permissions
- Static reference data
- Frequently accessed dashboard stats
- Therapist assignments (don't change often)

❌ **Don't cache:**
- Real-time data (notifications, recent messages)
- User-specific data that changes frequently
- Data requiring immediate consistency
- Write operations

## 3. Query Optimization with EXPLAIN

Use EXPLAIN to analyze and optimize slow queries.

### Usage

#### Analyze a Query
```javascript
const queryOptimizer = require('../utils/queryOptimizer');

// Basic EXPLAIN
const analysis = await queryOptimizer.explain(
  'SELECT * FROM patients WHERE status = ?',
  ['active']
);

console.log('Analysis:', analysis.analysis);
console.log('Recommendations:', analysis.recommendations);

// JSON format (more detailed)
const jsonAnalysis = await queryOptimizer.explainJson(
  'SELECT * FROM patients WHERE status = ?',
  ['active']
);

// Get query performance metrics
const metrics = await queryOptimizer.getQueryMetrics(
  'SELECT * FROM patients WHERE status = ?',
  ['active']
);
console.log(`Execution time: ${metrics.executionTime}ms`);
console.log(`Slow query: ${metrics.slow}`);
```

#### Run Optimization Script
```bash
node server/scripts/optimize-queries.js
```

This script analyzes common queries and provides optimization recommendations.

### Common Optimization Recommendations

1. **Full Table Scan Detected**
   - **Issue**: Query scans entire table
   - **Solution**: Add index on WHERE clause columns

2. **Using Filesort**
   - **Issue**: Temporary sort operation
   - **Solution**: Add index on ORDER BY columns

3. **Using Temporary Table**
   - **Issue**: Query creates temporary table
   - **Solution**: Optimize query structure or add indexes

4. **High Query Cost**
   - **Issue**: Query cost > 1000
   - **Solution**: Restructure query or add indexes

## 4. Example: Optimized Controller

Here's an example of using caching in a controller:

```javascript
const { getAll, getRow } = require('../config/database');

// Get system settings (cache for 10 minutes)
const getSystemSettings = async (req, res) => {
  try {
    const settings = await getRow(
      'SELECT * FROM system_settings WHERE id = 1',
      [],
      { useCache: true, cacheTTL: 10 * 60 * 1000 }
    );
    
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get therapist assignments (cache for 5 minutes)
const getTherapistAssignments = async (req, res) => {
  try {
    const assignments = await getAll(
      'SELECT * FROM patient_therapist_assignments WHERE status = ?',
      ['active'],
      { useCache: true }
    );
    
    res.json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Invalidate cache when data changes
const updateTherapistAssignment = async (req, res) => {
  try {
    await runQuery(
      'UPDATE patient_therapist_assignments SET status = ? WHERE id = ?',
      ['inactive', req.params.id]
    );
    
    // Invalidate related cache
    const queryCache = require('../utils/queryCache');
    queryCache.invalidate('patient_therapist_assignments');
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

## 5. Monitoring

### Pool Statistics
```javascript
const { getPoolStats } = require('../config/database');

const stats = getPoolStats();
console.log('Total connections:', stats.totalConnections);
console.log('Free connections:', stats.freeConnections);
console.log('Queued requests:', stats.queuedRequests);
```

### Cache Statistics
```javascript
const queryCache = require('../utils/queryCache');

const stats = queryCache.getStats();
console.log('Cache hits:', stats.hits);
console.log('Cache misses:', stats.misses);
console.log('Hit rate:', stats.hitRate);
console.log('Cache size:', stats.size);
```

## 6. Best Practices

1. **Use connection pooling** - Always use `pool` instead of creating new connections
2. **Cache strategically** - Only cache data that doesn't change frequently
3. **Invalidate on updates** - Clear cache when data is modified
4. **Monitor slow queries** - Use EXPLAIN regularly to identify bottlenecks
5. **Add indexes** - Create indexes on frequently queried columns
6. **Use appropriate TTLs** - Longer TTL for static data, shorter for dynamic data

## 7. Performance Tips

- **Index frequently queried columns**: `WHERE`, `ORDER BY`, `JOIN` columns
- **Avoid SELECT ***: Only select needed columns
- **Use LIMIT**: When fetching large datasets
- **Batch operations**: Group multiple operations when possible
- **Monitor query logs**: Check MySQL slow query log regularly

