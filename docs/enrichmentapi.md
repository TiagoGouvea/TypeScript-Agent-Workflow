# EnrichmentAPI Documentation

## Links Relevantes

### Documentação Oficial
- **API Documentation**: https://docs.enrichmentapi.io/
- **Getting Started**: https://docs.enrichmentapi.io/
- **Person API**: https://docs.enrichmentapi.io/person-api
- **Tech Stack API**: https://docs.enrichmentapi.io/tech-stack-api

### APIs Principais que Usaremos

#### Company APIs
- **Company API**: Get comprehensive company information
  - Input: Domain, name, or LinkedIn ID
  - Output: Company details, revenue, employees, location, tech stack
  - Cost: 5 credits per request

#### Person APIs
- **Person API**: Get detailed person information
  - Input: LinkedIn ID, email, or name with company
  - Output: Profile, experience, education, contact info
  - Cost: 10 credits per request

- **Reverse Email Lookup API**: Find person from email
  - Input: Email address
  - Output: Person profile and company information
  - Cost: 10 credits per request

#### Additional APIs
- **Employees API**: Get company employees (10 credits)
- **Company Investment API**: Investment data (1 credit)
- **Tech Stack API**: Company technology stack (1 credit)
- **Company to Domain API**: Convert company name to domain (Free)

## API Specifications

### Base URL
```
https://api.enrichmentapi.io
```

### Authentication
- Method: API Key via query parameter
- Parameter: `api_key`

### Request Format
- Method: GET
- Query parameters include API key and search parameters

### Example Requests
```bash
# Person search by LinkedIn ID
curl "https://api.enrichmentapi.io/person?api_key=APIKEY&linkedin_id=satyanadella"

# Company search by domain
curl "https://api.enrichmentapi.io/company?api_key=APIKEY&domain=apple.com"

# Company search by name
curl "https://api.enrichmentapi.io/company?api_key=APIKEY&name=Apple"
```

### Response Format
- All responses return JSON
- Success: HTTP 200 with data array
- Errors: 404 (not found), 408 (timeout), 403 (limit exceeded)

### Rate Limits & Costs
- Free plan: 50 requests per month
- Paid plans: Basic (25k credits), Standard (65k), Premium (300k)
- Only charged for successful requests (HTTP 200)

### Error Handling
- Requests retried up to 60 seconds
- 1-2% of requests may timeout (408 error)
- No charge for failed requests

## Implementação

### Company Search
1. **By Domain**: `/company?api_key=KEY&domain=example.com`
2. **By Name**: `/company?api_key=KEY&name=Company Name`
3. **By LinkedIn**: `/company?api_key=KEY&linkedin_id=company-id`

### Person Search
1. **By LinkedIn ID**: `/person?api_key=KEY&linkedin_id=person-id`
2. **By Email**: `/person?api_key=KEY&email=email@example.com`
3. **By Name + Company**: `/person?api_key=KEY&name=Full Name&company=Company`

## Próximos Passos
1. ✅ Obter API key do dashboard
2. ✅ Implementar service methods
3. ✅ Criar tool interfaces
4. ✅ Desenvolver testes abrangentes
5. ✅ Implementar sistema de cache