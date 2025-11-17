/**
 * Helper utilities for Rails-style controller/action organization
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps a route handler to add controller and action metadata for Rails-style logging
 * 
 * @example
 * ```typescript
 * app.get('/articles', controllerAction('ArticlesController', 'index', (req, res) => {
 *   res.json({ articles: [] });
 * }));
 * // Output: "Processing by ArticlesController#index as HTML"
 * ```
 */
export function controllerAction(
  controller: string,
  action: string,
  handler: RequestHandler
): RequestHandler {
  const wrappedHandler = (req: Request, res: Response, next: NextFunction) => {
    // Attach metadata to the route for the logger to pick up
    if (req.route) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req.route as any).controller = controller;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req.route as any).action = action;
    }
    return handler(req, res, next);
  };

  // Preserve the original function name for debugging
  Object.defineProperty(wrappedHandler, 'name', {
    value: handler.name || `${controller}#${action}`,
  });

  return wrappedHandler;
}

/**
 * Creates a controller action wrapper for a specific controller
 * 
 * @example
 * ```typescript
 * const articlesController = createController('ArticlesController');
 * 
 * app.get('/articles', articlesController('index', (req, res) => {
 *   res.json({ articles: [] });
 * }));
 * ```
 */
export function createController(controllerName: string) {
  return (action: string, handler: RequestHandler): RequestHandler => {
    return controllerAction(controllerName, action, handler);
  };
}

/**
 * Base controller class for organizing route handlers
 * 
 * @example
 * ```typescript
 * class ArticlesController extends BaseController {
 *   static index(req, res) {
 *     res.json({ articles: [] });
 *   }
 *   
 *   static show(req, res) {
 *     res.json({ article: { id: req.params.id } });
 *   }
 * }
 * 
 * app.get('/articles', ArticlesController.route('index'));
 * app.get('/articles/:id', ArticlesController.route('show'));
 * ```
 */
export class BaseController {
  /**
   * Creates a route handler with controller and action metadata
   */
  static route(action: string): RequestHandler {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (this as any)[action];
    if (!handler) {
      throw new Error(`Action ${action} not found on ${this.name}`);
    }
    return controllerAction(this.name, action, handler.bind(this));
  }
}
