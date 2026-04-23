# Agent Documentation

Complete documentation for the Eduator AI Agent system.

## Overview

The Eduator AI Agent is an intelligent, autonomous system that can understand natural language questions, generate SQL queries, and provide helpful responses. It uses agentic reasoning with self-correction capabilities, dynamic schema awareness, and enhanced question understanding.

## Documentation Index

### Core Documentation

1. **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Complete feature list and implementation details
   - All features and improvements
   - Architecture overview
   - Configuration options
   - Usage examples

2. **[AGENTIC_IMPROVEMENTS.md](./AGENTIC_IMPROVEMENTS.md)** - Detailed explanation of agentic improvements
   - Reflection/Retry Loop Pattern
   - Enhanced Tool Definitions
   - Schema-Awareness
   - Critic/Review Step
   - Intent Classification
   - Recent enhancements

3. **[SCHEMA_AWARENESS.md](./SCHEMA_AWARENESS.md)** - Dynamic schema awareness implementation
   - How schema loading works
   - Integration with reflection system
   - Performance considerations
   - Fallback mechanisms

## Key Features

### 🧠 Intelligent Question Understanding
- **Think First Approach**: Analyzes questions before generating SQL
- **Synonym Recognition**: Understands that "have" = "created by" = "belongs to"
- **Pattern Recognition**: Recognizes various phrasings for same intent
- **Consistent Results**: Same question = Same SQL regardless of phrasing

### 🔄 Reflection & Self-Correction
- **Autonomous Error Correction**: Learns from errors and retries
- **Error Categorization**: Classifies errors for targeted fixes
- **Up to 3 Retries**: Intelligent retry loop with full error history
- **Critic Review**: Multi-agent validation before execution

### 🗄️ Schema Awareness
- **Dynamic Schema Loading**: Fetches actual database structure
- **Table Validation**: Verifies tables/columns exist
- **Verified Static Schema**: Comprehensive documentation
- **Self-Adapting**: Adjusts to schema changes

### 🔒 Security
- **Query Validation**: Ensures only SELECT queries
- **Word Boundary Detection**: Prevents false positives
- **Comprehensive Blocking**: Blocks dangerous operations
- **RLS Support**: Respects Row-Level Security

### 🎯 Enhanced Intent Classification
- **Smart Classification**: Understands inquiry vs action vs conversation
- **Multi-Step Detection**: Identifies complex actions
- **Suggested SQL**: Provides SQL suggestions when confident
- **Flexible Recognition**: Handles various question phrasings

## Quick Start

### Basic Usage

```typescript
import { createAgent } from '@eduator/agent'

const agent = createAgent({
  profileType: 'platform_owner',
  organizationId: null,
})

const response = await agent.process({
  message: "how many exam and lesson have muallim@bdu.az"
})

console.log(response.text) // AI-formatted response
console.log(response.rawData) // Raw JSON data
```

### Configuration

```typescript
const reflection = new SQLReflection(context, client, {
  maxRetries: 3,        // Maximum retry attempts
  enableCritic: true,   // Enable critic/review step
  includeSchema: true,  // Include schema context
})
```

## Architecture

### Flow Diagram

```
User Question
    ↓
Intent Classification (Think First)
    ↓
SQL Generation (with Schema Context)
    ↓
Critic Review (Quick Checks + LLM)
    ↓
SQL Execution
    ↓
Success? → Format Results → Return
    ↓
Error? → Reflect & Categorize → Retry (up to 3x)
```

### State Machine

The agent operates through these states:
- **THINKING**: Analyzing question
- **GENERATING**: Creating SQL
- **REVIEWING**: Critic validation
- **EXECUTING**: Running query
- **REFLECTING**: Error analysis
- **FORMATTING**: Result formatting
- **SUCCESS/FAILED**: Final state

## Common Query Patterns

### Counting Items
```sql
-- Count exams and lessons by teacher email
SELECT 'exams' as type, COUNT(*) as count
FROM exams e
JOIN profiles p ON e.created_by = p.id
WHERE p.email = 'teacher@example.com' AND p.profile_type = 'teacher'
UNION ALL
SELECT 'lessons' as type, COUNT(*) as count
FROM lessons l
JOIN profiles p ON l.created_by = p.id
WHERE p.email = 'teacher@example.com' AND p.profile_type = 'teacher'
```

### Querying by Organization
```sql
-- Get teachers in organization (use ILIKE for case-insensitive matching)
SELECT p.* FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE o.name ILIKE '%organization-name%'
AND p.profile_type = 'teacher'
AND p.is_active = true
AND p.approval_status = 'approved'
```

## Best Practices

### For Developers

1. **Use Verified Schema**: Always reference `DATABASE_SCHEMA` for correct table/column names
2. **Test Variations**: Test same question in different phrasings
3. **Monitor Reflection**: Check reflection attempts for error patterns
4. **Update Prompts**: Keep prompts updated with new patterns

### For Users

1. **Be Specific**: Include email, organization name, or other identifiers
2. **Use Natural Language**: Ask questions naturally, the agent understands variations
3. **Check Results**: Review raw data if needed for verification

## Troubleshooting

### Common Issues

**Issue**: "Query contains blocked keyword: CREATE"
- **Solution**: Fixed - uses word boundaries, "created_by" no longer triggers error

**Issue**: Different results for same question
- **Solution**: Fixed - consistent query generation regardless of phrasing

**Issue**: "Cannot read properties of undefined"
- **Solution**: Fixed - proper attempt tracking and explanation handling

**Issue**: "No results found" when data exists
- **Solution**: Check organization name spelling, use ILIKE for case-insensitive matching

## Testing

### Manual Testing

Test the agent with various question phrasings:
- "how many exam and lesson have muallim@bdu.az"
- "how many exam and lesson was created by muallim@bdu.az"
- "can you tell me how many exam and lesson have muallim@bdu.az"

All should return the same results.

### Automated Testing

Run tests to verify:
- Reflection loop works correctly
- Critic catches issues
- Schema validation functions
- Security guards block dangerous queries

## Performance

- **First Schema Load**: ~200-500ms
- **Cached Schema**: <1ms
- **SQL Generation**: ~500-2000ms (depends on LLM)
- **Query Execution**: Varies by query complexity
- **Result Formatting**: ~500-1500ms (AI formatting)

## Security

- ✅ Only SELECT queries allowed
- ✅ Word boundary keyword detection
- ✅ RLS (Row-Level Security) support
- ✅ Table access validation
- ✅ Comprehensive security guards

## Future Enhancements

See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for planned improvements:
- Conversation history tracking
- Learning from successful patterns
- Adaptive retry strategies
- Query caching
- Column-level validation
- Relationship validation

## Support

For issues or questions:
1. Check documentation in this folder
2. Review error logs for reflection attempts
3. Test with different question phrasings
4. Verify database schema matches documentation

## Related Files

- `packages/agent/src/core/reflection.ts` - Reflection loop implementation
- `packages/agent/src/core/schema-loader.ts` - Schema loading
- `packages/agent/src/prompts/system.ts` - System prompts
- `packages/agent/src/prompts/database-schema.ts` - Schema documentation
- `packages/agent/src/security/guards.ts` - Security validation

---

**Last Updated**: Includes all features through latest improvements (question understanding, security fixes, error handling, query consistency)
