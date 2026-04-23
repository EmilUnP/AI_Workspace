"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFeatureFlagChecker = exports.isFeatureEnabledForProfile = exports.isFeatureEnabledForOrganization = exports.isFeatureEnabled = exports.getAllFeatureFlags = exports.isTest = exports.isProduction = exports.isDevelopment = exports.getEnv = exports.getFeatureFlags = exports.validateClientEnv = exports.validateServerEnv = void 0;
// Constants
__exportStar(require("./constants"), exports);
// Environment
var env_1 = require("./env");
Object.defineProperty(exports, "validateServerEnv", { enumerable: true, get: function () { return env_1.validateServerEnv; } });
Object.defineProperty(exports, "validateClientEnv", { enumerable: true, get: function () { return env_1.validateClientEnv; } });
Object.defineProperty(exports, "getFeatureFlags", { enumerable: true, get: function () { return env_1.getFeatureFlags; } });
Object.defineProperty(exports, "getEnv", { enumerable: true, get: function () { return env_1.getEnv; } });
Object.defineProperty(exports, "isDevelopment", { enumerable: true, get: function () { return env_1.isDevelopment; } });
Object.defineProperty(exports, "isProduction", { enumerable: true, get: function () { return env_1.isProduction; } });
Object.defineProperty(exports, "isTest", { enumerable: true, get: function () { return env_1.isTest; } });
// Feature Flags
var feature_flags_1 = require("./feature-flags");
Object.defineProperty(exports, "getAllFeatureFlags", { enumerable: true, get: function () { return feature_flags_1.getAllFeatureFlags; } });
Object.defineProperty(exports, "isFeatureEnabled", { enumerable: true, get: function () { return feature_flags_1.isFeatureEnabled; } });
Object.defineProperty(exports, "isFeatureEnabledForOrganization", { enumerable: true, get: function () { return feature_flags_1.isFeatureEnabledForOrganization; } });
Object.defineProperty(exports, "isFeatureEnabledForProfile", { enumerable: true, get: function () { return feature_flags_1.isFeatureEnabledForProfile; } });
Object.defineProperty(exports, "createFeatureFlagChecker", { enumerable: true, get: function () { return feature_flags_1.createFeatureFlagChecker; } });
//# sourceMappingURL=index.js.map