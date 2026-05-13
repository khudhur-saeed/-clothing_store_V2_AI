import logging
from elasticsearch import Elasticsearch, ConnectionError, ConnectionTimeout, TransportError

logger = logging.getLogger(__name__)

# Create a single connection we can reuse across the whole app
es = Elasticsearch(
    "http://localhost:9200",
    request_timeout=5,   # Don't hang the API for more than 5 seconds
    max_retries=1,
    retry_on_timeout=False,
)
INDEX_NAME = "products"


def _is_es_available() -> bool:
    """Quick check whether Elasticsearch is reachable."""
    try:
        return es.ping(request_timeout=2)
    except Exception:
        return False


def create_index():
    """Drops the existing index (if it exists) and creates a fresh one with mappings.
    Uses 0 replicas so it works correctly on a single-node cluster.
    """
    if not _is_es_available():
        logger.warning("Elasticsearch is not available — skipping index creation.")
        return

    # 1. Delete the old index if we are starting fresh (good for development)
    if es.indices.exists(index=INDEX_NAME):
        es.indices.delete(index=INDEX_NAME)
        print(f"Deleted old {INDEX_NAME} index.")

    # 2. Define the exact structure of our documents
    mapping = {
        "properties": {
            "product_id": {"type": "integer"},

            # Text fields are analyzed piece by piece for fuzzy searching
            "name": {"type": "text"},
            "description": {"type": "text"},

            # Keyword fields are checked for exact matches (good for categories/status)
            "status": {"type": "keyword"},
            "department": {"type": "keyword"},
            "outfit_slot": {"type": "keyword"},

            "price": {"type": "float"},
        }
    }

    # 3. Create the index with 0 replicas (required for single-node Elasticsearch)
    es.indices.create(
        index=INDEX_NAME,
        settings={"number_of_shards": 1, "number_of_replicas": 0},
        mappings=mapping,
    )
    print(f"✅ Successfully created '{INDEX_NAME}' index with mappings!")


def index_product(product):
    """
    Sends a single product to Elasticsearch.
    'product' is a SQLAlchemy Product model object from our database.
    Failures are logged but do NOT crash the API.
    """
    doc = {
        "product_id": product.product_id,
        "name": product.name,
        "description": product.description,
        "price": float(product.price) if product.price else None,
        "status": product.status,
        "department": product.department.value if product.department else None,
        "outfit_slot": product.outfit_slot.value if product.outfit_slot else None,
    }

    try:
        es.index(
            index=INDEX_NAME,
            id=product.product_id,  # Use PostgreSQL ID as Elasticsearch ID
            document=doc,
        )
    except (ConnectionError, ConnectionTimeout, TransportError, Exception) as exc:
        logger.warning(
            "Elasticsearch unavailable — product %s NOT indexed: %s",
            product.product_id,
            exc,
        )


def delete_product(product_id: int):
    """
    Removes a product from Elasticsearch by its ID.
    Failures are logged but do NOT crash the API.
    """
    try:
        es.delete(index=INDEX_NAME, id=product_id, ignore_status=404)
    except (ConnectionError, ConnectionTimeout, TransportError, Exception) as exc:
        logger.warning(
            "Elasticsearch unavailable — product %s NOT removed from index: %s",
            product_id,
            exc,
        )


def search_products(search_string: str):
    """
    Searches Elasticsearch for products matching the search string.
    Returns a list of matching product_ids.
    Falls back to an empty list if Elasticsearch is unavailable.
    """
    if not search_string:
        return []

    query_body = {
        "query": {
            "multi_match": {
                "query": search_string,
                "fields": ["name", "description"],  # Search both fields!
                "fuzziness": "AUTO",  # Allows minor typos (e.g. "denm" -> "denim")
            }
        }
    }

    try:
        response = es.search(index=INDEX_NAME, body=query_body)
        hit_list = response["hits"]["hits"]
        # ES stores IDs as strings; cast to int so SQLAlchemy IN-filter works
        return [int(hit["_id"]) for hit in hit_list]
    except (ConnectionError, ConnectionTimeout, TransportError, Exception) as exc:
        logger.warning("Elasticsearch search failed, falling back to DB search: %s", exc)
        return None  # None signals the caller to fall back to DB ILIKE


# If you run this file directly, it will recreate the index
if __name__ == "__main__":
    create_index()
