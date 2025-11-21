import { Request, Response, NextFunction } from 'express';
import { controllerAction, createController, BaseController } from '../src/controllerHelpers';

describe('Controller Helpers Unit Tests', () => {
  // Mock Express objects
  const mockRequest = () => {
    return {
      route: {},
      params: {},
      body: {},
      query: {},
    } as unknown as Request;
  };

  const mockResponse = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = jest.fn() as NextFunction;

  describe('controllerAction', () => {
    it('should attach controller and action to req.route', () => {
      const req = mockRequest();
      const res = mockResponse();
      const handler = jest.fn();
      
      const wrapped = controllerAction('TestController', 'testAction', handler);
      wrapped(req, res, mockNext);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((req.route as any).controller).toBe('TestController');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((req.route as any).action).toBe('testAction');
      expect(handler).toHaveBeenCalledWith(req, res, mockNext);
    });

    it('should handle missing req.route gracefully', () => {
      const req = mockRequest();
      delete (req as any).route;
      const res = mockResponse();
      const handler = jest.fn();

      const wrapped = controllerAction('TestController', 'testAction', handler);
      wrapped(req, res, mockNext);

      expect(handler).toHaveBeenCalledWith(req, res, mockNext);
    });

    it('should set the function name', () => {
      const handler = () => {};
      Object.defineProperty(handler, 'name', { value: '' });
      const wrapped = controllerAction('TestController', 'testAction', handler);
      
      expect(wrapped.name).toBe('TestController#testAction');
    });

    it('should preserve existing function name if present', () => {
        const handler = function ExistingName() {};
        const wrapped = controllerAction('TestController', 'testAction', handler as any);
        
        expect(wrapped.name).toBe('ExistingName');
    });
  });

  describe('createController', () => {
    it('should create a wrapper for the specific controller', () => {
      const req = mockRequest();
      const res = mockResponse();
      const handler = jest.fn();

      const testController = createController('MyController');
      const wrapped = testController('myAction', handler);
      
      wrapped(req, res, mockNext);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((req.route as any).controller).toBe('MyController');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((req.route as any).action).toBe('myAction');
      expect(handler).toHaveBeenCalledWith(req, res, mockNext);
    });
  });

  describe('BaseController', () => {
    class TestController extends BaseController {
      static testMethod(_req: Request, _res: Response, next: NextFunction) {
        next();
      }
    }

    it('should route to a static method', () => {
      const req = mockRequest();
      const res = mockResponse();
      
      const handler = TestController.route('testMethod');
      handler(req, res, mockNext);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((req.route as any).controller).toBe('TestController');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((req.route as any).action).toBe('testMethod');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error if method does not exist', () => {
      expect(() => {
        TestController.route('nonExistentMethod');
      }).toThrow('Action nonExistentMethod not found on TestController');
    });
  });
});
