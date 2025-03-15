// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

// Define the bytes4 constant for IERC721Enumerable interface ID
bytes4 constant _INTERFACE_ID_ERC721_ENUMERABLE = 0x780e9d63;

/**
 * @title ScrollifyOriginals
 * @dev ERC721 contract for minting unique original NFTs with pricing and royalties
 */
contract ScrollifyOriginals is ERC721, Ownable, IERC2981 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    uint256 public constant MINT_PRICE = 0.01 ether;
    uint96 public constant ROYALTY_PERCENTAGE = 10000; // 100% (in basis points)
    uint256 public constant MAX_SUPPLY = 100; // Maximum of 100 NFTs can be minted

    // Mappings for token data
    mapping(uint256 => address) public creators;
    mapping(uint256 => string) private _tokenURIs;
    
    // Enumerable storage
    mapping(address => mapping(uint256 => uint256)) private _ownedTokens;
    mapping(uint256 => uint256) private _ownedTokensIndex;
    uint256[] private _allTokens;
    mapping(uint256 => uint256) private _allTokensIndex;

    event OriginalMinted(uint256 indexed tokenId, address indexed creator, string tokenURI);

    constructor() ERC721("Scrollify Originals", "SCROLL-O") Ownable(msg.sender) {}

    /**
     * @dev Mints a unique original NFT
     * @param _tokenURI Metadata URI
     */
    function mintOriginal(string calldata _tokenURI) external payable {
        require(msg.value == MINT_PRICE, "Incorrect ETH amount");
        require(_tokenIds.current() < MAX_SUPPLY, "Maximum supply reached");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        creators[newTokenId] = msg.sender;
        
        // Add token to enumeration
        _addTokenToAllTokensEnumeration(newTokenId);
        _addTokenToOwnerEnumeration(msg.sender, newTokenId);

        emit OriginalMinted(newTokenId, msg.sender, _tokenURI);
    }

    /**
     * @dev Set token URI
     */
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        require(_exists(tokenId), "URI set of nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }
    
    /**
     * @dev Get token URI
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");
        
        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();
        
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        
        if (bytes(_tokenURI).length > 0) {
            return string(abi.encodePacked(base, _tokenURI));
        }
        
        return super.tokenURI(tokenId);
    }
    
    /**
     * @dev Check if token exists
     */
    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @dev Enumerable token handling - add token to owner enumeration
     */
    function _addTokenToOwnerEnumeration(address to, uint256 tokenId) private {
        uint256 length = balanceOf(to);
        _ownedTokens[to][length] = tokenId;
        _ownedTokensIndex[tokenId] = length;
    }

    /**
     * @dev Enumerable token handling - add token to all tokens enumeration
     */
    function _addTokenToAllTokensEnumeration(uint256 tokenId) private {
        _allTokensIndex[tokenId] = _allTokens.length;
        _allTokens.push(tokenId);
    }
    
    /**
     * @dev Get token of owner by index
     */
    function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256) {
        require(index < balanceOf(owner), "Index out of bounds");
        return _ownedTokens[owner][index];
    }
    
    /**
     * @dev Get token by index
     */
    function tokenByIndex(uint256 index) public view returns (uint256) {
        require(index < totalSupply(), "Index out of bounds");
        return _allTokens[index];
    }
    
    /**
     * @dev Get total supply
     */
    function totalSupply() public view returns (uint256) {
        return _allTokens.length;
    }

    /**
     * @dev Withdraw contract balance to owner
     */
    function withdrawFunds() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev Implements EIP-2981 royalty info (100% to creator)
     */
    function royaltyInfo(uint256 tokenId, uint256 salePrice) external view override returns (address receiver, uint256 royaltyAmount) {
        // Return the creator of the token as the royalty receiver
        return (creators[tokenId], (salePrice * ROYALTY_PERCENTAGE) / 10000);
    }

    /**
     * @dev Required override for multiple inheritance
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, IERC165) returns (bool) {
        return 
            interfaceId == type(IERC2981).interfaceId || 
            interfaceId == _INTERFACE_ID_ERC721_ENUMERABLE ||
            super.supportsInterface(interfaceId);
    }
}