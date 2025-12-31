# Cache Module Documentation

This module provides a robust, flexible, and distributed caching system for the application. It is built on top of **Keyv** and **Redis**, featuring advanced patterns like **Stale-While-Revalidate**, **Distributed Locking**, and **Version-Based Invalidation**.

## 🚀 Correct Features

- **Multiple Caching Strategies**: specific strategies for different consistency needs (Simple, SWR, Locking).
- **Distributed Locking**: Prevents _Thundering Herd_ problems in high-concurrency environments using Redis Locks (Redlock pattern simplified).
- **Stale-While-Revalidate (SWR)**: Improves API latency by serving stale data while refreshing it in the background.
- **Version-Based Invalidation**: Allows invalidating entire groups of keys (e.g., "all products") without needing wildcards, using a versioning system.
- **Jitter**: Randomized TTLs to prevent cache stampedes when many keys expire simultaneously.
- **Query-Based Keys**: Automatically generates consistent cache keys based on entity names and query objects.

---

## 🏗 Architecture

The module follows the **Strategy Pattern** to separate caching logic from the service layer.

### Core Components

1.  **`CacheService`**: The main entry point. It handles high-level logic like key generation (`entity` + `query` + `version`), TTL calculation (jitter), and invalidation. It delegates the actual data retrieval to the `CacheFactory`.
2.  **`CacheFactoryService`**: Responsible for selecting and instantiating the correct `CacheStrategy` based on the requested `type`.
3.  **`CacheStrategy` (Interface)**: Defines the contract that all caching strategies must follow (`execute`).
4.  **`CacheStrategies`**:
    - `simpleFind`: Basic caching. Cache miss = fetch & store.
    - `staleWhileRevalidate`: Serves stale data immediately if available, then updates in background.
    - `cacheLocking`: Uses a distributed Redis lock to ensure only ONE process fetches data when there is a cache miss. ideally for expensive queries.
    - `staleWhileRevalidateWithLock`: Combines SWR with distributed locking for maximum consistency and performance.

---

## 🛠 Usage

Inject `CacheService` into your services to start using it.

### 1. `remember<T>`

Retrieves data from cache or runs the fallback function.

```typescript
import { CacheService } from 'src/cache/cache.service';

constructor(private readonly cacheService: CacheService) {}

async getCategories() {
  return await this.cacheService.remember<Category[]>({
    // Strategy type
    type: "staleWhileRevalidateWithLock",

    // Key generation
    entity: "categories",
    query: { all: true }, // Optional: uniquely identifies this query

    // Options
    aditionalOptions: {
      ttlMilliseconds: 60000,    // Hard expiry (1 min)
      staleTimeMilliseconds: 30000 // Refresh in background after 30s
    },

    // Fetcher function
    fallback: async () => {
      return await this.prisma.category.findMany();
    }
  });
}
```

### 2. Manual Invalidation

Invalidate specific queries or entire entities. This works by incrementing a "version" counter for the entity, effectively making all previous keys for that entity unreachable (soft delete).

```typescript
// Invalidate a specific query
await this.cacheService.invalidateQuery('categories', { all: true });

// Invalidate ALL keys for 'categories' entity
await this.cacheService.invalidateQuery('categories');
```

---

## 🧠 Strategies Explained

### 1. `simpleFind`

- **Behavior**: Standard cache. Check cache -> Return if exists -> Else run fallback -> Save -> Return.
- **Use Case**: Simple data, low concurrency.

### 2. `staleWhileRevalidate`

- **Behavior**:
  - If cache exists but is "stale" (older than `staleTime` but valid TTL): **Return stale data immediately** and trigger a background refresh.
  - If cache missing: Run fallback and wait.
- **Use Case**: High-traffic read endpoints where low latency is priority over strong consistency (e.g., Product lists, Menus).

### 3. `cacheLocking`

- **Behavior**:
  - **Leader**: The first request acquires a Redis lock (`SET NX PX`), runs the fallback, and saves to cache.
  - **Followers**: Other concurrent requests wait (polling) for the lock to be released or for the value to appear in cache.
- **Use Case**: Expensive queries driven by user actions, preventing database overload (Thundering Herd).

### 4. `staleWhileRevalidateWithLock`

- **Behavior**: Hybrid approach.
  - **Hit (Stale)**: Returns immediately, attempts to acquire lock for background refresh. If locked, skips refresh (another node is doing it).
  - **Miss**: Acquires lock to fetch data (protects DB). Followers wait.
- **Use Case**: The "Gold Standard" for high-traffic, expensive-to-compute data.

---

## ⚙️ Configuration

### Environment Variables

The module relies on Redis/Keyv configuration. Ensure these are set:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Keyv Instance

Configured in `keyv.config.ts`, using the connection string `redis://${host}:${port}` and namespace `igaProductos`.

---

## 🔐 Internals: Locking Mechanism

The locking logic relies on Redis atomic commands:

- **Acquire**: `SET resource_name my_random_value NX PX 10000`
  - `NX`: Only set if not exists.
  - `PX 10000`: Auto-expire lock after 10s (safety net).
- **Release**: Lua script to ensure we only delete the lock if _we_ own it (by checking the random value).

```lua
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
```

This prevents a process from releasing a lock that it no longer owns (e.g., if it paused for too long and the lock expired).
