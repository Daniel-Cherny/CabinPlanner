import { useEffect } from 'react';
import { useDesignStore } from '../stores/designStore';
import { ProfessionalDesignInterface } from './design/ProfessionalDesignInterface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SyncDemo() {
  const { setProject, addWall, addDoor, addWindow, project } = useDesignStore();

  // Initialize demo project
  useEffect(() => {
    const demoProject = {
      id: 'demo-cabin-1',
      name: 'Demo Cabin',
      width: 24,
      length: 32,
      height: 12,
      area: 768,
      style: 'modern' as const,
      foundationType: 'slab' as const,
      roofType: 'gabled' as const,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    setProject(demoProject);
  }, [setProject]);

  const addSampleElements = () => {
    // Add walls to form a simple rectangle
    const walls = [
      {
        id: 'wall-1',
        start: { x: 0, y: 0 },
        end: { x: 288, y: 0 }, // 24 feet * 12 pixels per foot
        thickness: 6,
        type: 'exterior' as const,
        height: 120 // 10 feet
      },
      {
        id: 'wall-2',
        start: { x: 288, y: 0 },
        end: { x: 288, y: 384 }, // 32 feet * 12 pixels per foot
        thickness: 6,
        type: 'exterior' as const,
        height: 120
      },
      {
        id: 'wall-3',
        start: { x: 288, y: 384 },
        end: { x: 0, y: 384 },
        thickness: 6,
        type: 'exterior' as const,
        height: 120
      },
      {
        id: 'wall-4',
        start: { x: 0, y: 384 },
        end: { x: 0, y: 0 },
        thickness: 6,
        type: 'exterior' as const,
        height: 120
      },
      // Interior wall
      {
        id: 'wall-5',
        start: { x: 144, y: 0 },
        end: { x: 144, y: 192 },
        thickness: 4,
        type: 'interior' as const,
        height: 120
      }
    ];

    walls.forEach(wall => addWall(wall));

    // Add doors
    const doors = [
      {
        id: 'door-1',
        wallId: 'wall-1',
        position: 0.5,
        width: 36,
        height: 84,
        swing: 'right' as const,
        type: 'entry' as const
      },
      {
        id: 'door-2',
        wallId: 'wall-5',
        position: 0.8,
        width: 32,
        height: 84,
        swing: 'left' as const,
        type: 'interior' as const
      }
    ];

    doors.forEach(door => addDoor(door));

    // Add windows
    const windows = [
      {
        id: 'window-1',
        wallId: 'wall-2',
        position: 0.3,
        width: 48,
        height: 36,
        sillHeight: 30,
        type: 'double' as const
      },
      {
        id: 'window-2',
        wallId: 'wall-2',
        position: 0.7,
        width: 48,
        height: 36,
        sillHeight: 30,
        type: 'double' as const
      },
      {
        id: 'window-3',
        wallId: 'wall-3',
        position: 0.5,
        width: 60,
        height: 48,
        sillHeight: 24,
        type: 'picture' as const
      }
    ];

    windows.forEach(window => addWindow(window));
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              DreamCabin Sync Demo
            </h1>
            <p className="text-gray-600">
              Real-time 2D ↔ 3D synchronization system demonstration
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={addSampleElements} variant="outline">
              Add Sample Elements
            </Button>
            <Button 
              onClick={() => useDesignStore.getState().clearHistory()}
              variant="outline"
            >
              Clear All
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <ProfessionalDesignInterface />
      </div>

      {/* Demo Instructions */}
      <div className="p-4 border-t bg-blue-50">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Synchronization Features Demo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">Real-time Sync</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Changes in 2D instantly reflect in 3D</li>
                  <li>• Batched updates for optimal performance</li>
                  <li>• Throttled sync to prevent excessive re-renders</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">Selection Sync</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Click elements in 3D to select in 2D</li>
                  <li>• Hover effects synchronized between views</li>
                  <li>• Multi-select support with visual feedback</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">Split Views</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Horizontal and vertical split modes</li>
                  <li>• Active pane focus management</li>
                  <li>• Synchronized pan and zoom controls</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">Undo/Redo</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Works across both 2D and 3D views</li>
                  <li>• Unlimited history with efficient storage</li>
                  <li>• Keyboard shortcuts (Ctrl+Z, Ctrl+Y)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">Auto-save</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Saves changes every 30 seconds</li>
                  <li>• Visual dirty state indicators</li>
                  <li>• Export and import functionality</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">Performance</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• FPS monitoring and display</li>
                  <li>• Efficient change detection</li>
                  <li>• Optimized 3D rendering pipeline</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SyncDemo;