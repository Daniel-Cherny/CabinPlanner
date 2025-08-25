import { useEffect, useCallback, useRef } from 'react';
import { useDesignStore } from '../stores/designStore';
import type { Wall, Door, Window, ElectricalElement, PlumbingElement, Room } from '../stores/designStore';

interface SyncOptions {
  batchDelay?: number; // ms to batch updates
  maxBatchSize?: number; // max updates per batch
  throttleInterval?: number; // ms between sync operations
}

interface UpdateBatch {
  timestamp: number;
  updates: Array<{
    type: 'wall' | 'door' | 'window' | 'electrical' | 'plumbing' | 'room';
    action: 'add' | 'update' | 'delete';
    id: string;
    data?: any;
  }>;
}

export function useSyncSystem(options: SyncOptions = {}) {
  const {
    batchDelay = 100,
    maxBatchSize = 10,
    throttleInterval = 50
  } = options;

  const store = useDesignStore();
  const batchRef = useRef<UpdateBatch>({ timestamp: 0, updates: [] });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);
  const subscribers3D = useRef<Set<(data: any) => void>>(new Set());
  const subscribers2D = useRef<Set<(data: any) => void>>(new Set());

  // Batch updates to prevent excessive re-renders
  const batchUpdate = useCallback((update: UpdateBatch['updates'][0]) => {
    const now = Date.now();
    
    // Initialize or reset batch if too old
    if (now - batchRef.current.timestamp > batchDelay) {
      batchRef.current = { timestamp: now, updates: [] };
    }
    
    // Add update to batch
    batchRef.current.updates.push(update);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Process batch if it's full or set timeout
    if (batchRef.current.updates.length >= maxBatchSize) {
      processBatch();
    } else {
      timeoutRef.current = setTimeout(processBatch, batchDelay);
    }
  }, [batchDelay, maxBatchSize]);

  const processBatch = useCallback(() => {
    const now = Date.now();
    
    // Throttle sync operations
    if (now - lastSyncRef.current < throttleInterval) {
      timeoutRef.current = setTimeout(processBatch, throttleInterval);
      return;
    }
    
    const batch = { ...batchRef.current };
    batchRef.current = { timestamp: now, updates: [] };
    lastSyncRef.current = now;
    
    if (batch.updates.length === 0) return;
    
    // Notify subscribers
    const syncData = {
      timestamp: now,
      updates: batch.updates,
      state: {
        walls: store.walls,
        doors: store.doors,
        windows: store.windows,
        rooms: store.rooms,
        electricalElements: store.electricalElements,
        plumbingElements: store.plumbingElements,
        project: store.project
      }
    };
    
    // Notify 3D subscribers
    subscribers3D.current.forEach(callback => {
      try {
        callback(syncData);
      } catch (error) {
        console.error('Error in 3D sync callback:', error);
      }
    });
    
    // Notify 2D subscribers  
    subscribers2D.current.forEach(callback => {
      try {
        callback(syncData);
      } catch (error) {
        console.error('Error in 2D sync callback:', error);
      }
    });
    
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [throttleInterval, store]);

  // Subscribe to store changes and batch them
  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    // Wall changes
    unsubscribes.push(
      useDesignStore.subscribe(
        (state) => state.walls,
        (walls, previousWalls) => {
          if (!store.syncEnabled) return;
          
          const changes = detectChanges(walls, previousWalls, 'wall');
          changes.forEach(change => batchUpdate(change));
        },
        { fireImmediately: false }
      )
    );

    // Door changes
    unsubscribes.push(
      useDesignStore.subscribe(
        (state) => state.doors,
        (doors, previousDoors) => {
          if (!store.syncEnabled) return;
          
          const changes = detectChanges(doors, previousDoors, 'door');
          changes.forEach(change => batchUpdate(change));
        },
        { fireImmediately: false }
      )
    );

    // Window changes
    unsubscribes.push(
      useDesignStore.subscribe(
        (state) => state.windows,
        (windows, previousWindows) => {
          if (!store.syncEnabled) return;
          
          const changes = detectChanges(windows, previousWindows, 'window');
          changes.forEach(change => batchUpdate(change));
        },
        { fireImmediately: false }
      )
    );

    // Room changes
    unsubscribes.push(
      useDesignStore.subscribe(
        (state) => state.rooms,
        (rooms, previousRooms) => {
          if (!store.syncEnabled) return;
          
          const changes = detectChanges(rooms, previousRooms, 'room');
          changes.forEach(change => batchUpdate(change));
        },
        { fireImmediately: false }
      )
    );

    // Electrical changes
    unsubscribes.push(
      useDesignStore.subscribe(
        (state) => state.electricalElements,
        (elements, previousElements) => {
          if (!store.syncEnabled) return;
          
          const changes = detectChanges(elements, previousElements, 'electrical');
          changes.forEach(change => batchUpdate(change));
        },
        { fireImmediately: false }
      )
    );

    // Plumbing changes
    unsubscribes.push(
      useDesignStore.subscribe(
        (state) => state.plumbingElements,
        (elements, previousElements) => {
          if (!store.syncEnabled) return;
          
          const changes = detectChanges(elements, previousElements, 'plumbing');
          changes.forEach(change => batchUpdate(change));
        },
        { fireImmediately: false }
      )
    );

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [store.syncEnabled, batchUpdate]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Helper function to detect changes
  const detectChanges = useCallback((
    newItems: any[],
    previousItems: any[],
    type: string
  ): UpdateBatch['updates'] => {
    const changes: UpdateBatch['updates'] = [];
    
    // Create maps for efficient lookup
    const newMap = new Map(newItems.map(item => [item.id, item]));
    const previousMap = new Map((previousItems || []).map(item => [item.id, item]));
    
    // Detect additions and updates
    newItems.forEach(item => {
      const previous = previousMap.get(item.id);
      if (!previous) {
        // New item
        changes.push({
          type: type as any,
          action: 'add',
          id: item.id,
          data: item
        });
      } else if (JSON.stringify(item) !== JSON.stringify(previous)) {
        // Updated item
        changes.push({
          type: type as any,
          action: 'update',
          id: item.id,
          data: item
        });
      }
    });
    
    // Detect deletions
    (previousItems || []).forEach(item => {
      if (!newMap.has(item.id)) {
        changes.push({
          type: type as any,
          action: 'delete',
          id: item.id
        });
      }
    });
    
    return changes;
  }, []);

  // API for components to subscribe to sync events
  const subscribe2D = useCallback((callback: (data: any) => void) => {
    subscribers2D.current.add(callback);
    return () => subscribers2D.current.delete(callback);
  }, []);

  const subscribe3D = useCallback((callback: (data: any) => void) => {
    subscribers3D.current.add(callback);
    return () => subscribers3D.current.delete(callback);
  }, []);

  // Manual sync trigger
  const triggerSync = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    processBatch();
  }, [processBatch]);

  // Get sync status
  const getSyncStatus = useCallback(() => {
    return {
      enabled: store.syncEnabled,
      pendingUpdates: batchRef.current.updates.length,
      lastSync: lastSyncRef.current,
      subscribers: {
        '2d': subscribers2D.current.size,
        '3d': subscribers3D.current.size
      }
    };
  }, [store.syncEnabled]);

  return {
    subscribe2D,
    subscribe3D,
    triggerSync,
    getSyncStatus,
    isEnabled: store.syncEnabled
  };
}

// Selection sync hook for coordinating selection between 2D and 3D views
export function useSelectionSync() {
  const store = useDesignStore();
  
  const syncSelectionFrom3DTo2D = useCallback((elementId: string, elementType: string) => {
    // When user clicks on 3D element, select it in 2D and focus
    store.setSelectedElements([elementId]);
    
    // If we have different view modes, we might want to switch to 2D or split view
    if (store.splitViewMode === '3d-only') {
      store.setSplitViewMode('split-horizontal');
      store.setActivePane('2d');
    }
    
    // Trigger specific 2D view update to show selection
    store.markDirty();
  }, [store]);
  
  const syncSelectionFrom2DTo3D = useCallback((elementId: string, elementType: string) => {
    // When user selects in 2D, highlight in 3D
    store.setSelectedElements([elementId]);
    
    // Trigger 3D view update to show selection
    store.markDirty();
  }, [store]);
  
  const syncHoverFrom3DTo2D = useCallback((elementId: string | null) => {
    store.setHoveredElement(elementId);
  }, [store]);
  
  const syncHoverFrom2DTo3D = useCallback((elementId: string | null) => {
    store.setHoveredElement(elementId);
  }, [store]);

  return {
    syncSelectionFrom3DTo2D,
    syncSelectionFrom2DTo3D,
    syncHoverFrom3DTo2D,
    syncHoverFrom2DTo3D,
    selectedElements: store.selectedElements,
    hoveredElement: store.hoveredElement
  };
}

// Performance monitoring hook
export function usePerformanceMonitor() {
  const frameTimeRef = useRef<number[]>([]);
  const fpsRef = useRef<number>(60);
  const lastFrameTimeRef = useRef<number>(performance.now());
  
  const updatePerformanceMetrics = useCallback(() => {
    const now = performance.now();
    const deltaTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;
    
    // Keep last 60 frames for FPS calculation
    frameTimeRef.current.push(deltaTime);
    if (frameTimeRef.current.length > 60) {
      frameTimeRef.current.shift();
    }
    
    // Calculate average FPS
    if (frameTimeRef.current.length > 0) {
      const avgFrameTime = frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length;
      fpsRef.current = Math.round(1000 / avgFrameTime);
    }
    
    requestAnimationFrame(updatePerformanceMetrics);
  }, []);
  
  useEffect(() => {
    const animId = requestAnimationFrame(updatePerformanceMetrics);
    return () => cancelAnimationFrame(animId);
  }, [updatePerformanceMetrics]);
  
  const getPerformanceMetrics = useCallback(() => {
    return {
      fps: fpsRef.current,
      frameTime: frameTimeRef.current.length > 0 ? 
        frameTimeRef.current[frameTimeRef.current.length - 1] : 0,
      avgFrameTime: frameTimeRef.current.length > 0 ?
        frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length : 0
    };
  }, []);
  
  return { getPerformanceMetrics, currentFPS: fpsRef.current };
}

export default useSyncSystem;